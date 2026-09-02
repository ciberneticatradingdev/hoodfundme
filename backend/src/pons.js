import crypto from "node:crypto";
import { parseAbi, parseEventLogs, zeroAddress } from "viem";
import { config } from "./config.js";
import { client, walletClientFor } from "./evm.js";

/// pons v2 engine — launches on the pons launch factory (Robinhood Chain) and
/// collects the creator fee stream (curve sweeps + fee escrow claims).
/// Protocol surface from docs.ponsfamily.com/docs/v2 (same integration as
/// robintok). Native-quote (ETH) launches only.

export const FACTORY_ABI = parseAbi([
  "struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }",
  "struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }",
  "function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)",
  "function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)",
  "function launchFee() view returns (uint256)",
  "function canLaunch(address launcher) view returns (bool)",
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
]);

export const CURVE_ABI = parseAbi([
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)",
  "function quoteFeeBalance() view returns (uint256)",
  "function creatorTaxBalance() view returns (uint256)",
  "function realQuoteReserve() view returns (uint256)",
  "function graduationThreshold() view returns (uint256)",
  "function graduated() view returns (bool)",
  "function sweepFees(uint256 minBuybackTokensOut)",
]);

export const ESCROW_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function claim(uint256 amount)",
]);

function randomSalt() {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

/// One transaction on the pons factory. The custodial coin wallet is the
/// launcher AND the creatorFeeRecipient — every creator fee accrues to it,
/// reserved for the linked charity campaign.
export async function launchCoin({ account, name, symbol, logo, description, website, twitter, telegram }) {
  const factory = config.ponsFactory;
  const configId = BigInt(config.ponsLaunchConfigId);
  const pairToken = zeroAddress; // native ETH quote

  const [expectedEconomics, launchFee, allowed] = await Promise.all([
    client.readContract({ address: factory, abi: FACTORY_ABI, functionName: "previewLaunchEconomics", args: [configId, pairToken] }),
    client.readContract({ address: factory, abi: FACTORY_ABI, functionName: "launchFee" }),
    client.readContract({ address: factory, abi: FACTORY_ABI, functionName: "canLaunch", args: [account.address] }),
  ]);
  if (!allowed) throw new Error("pons launch gate is closed for this wallet right now");

  const params = {
    name,
    symbol,
    logo: logo || "",
    description: description || "",
    socials: { twitter: twitter || "", telegram: telegram || "", discord: "", website: website || "", farcaster: "" },
    creatorFeeRecipient: account.address,
    creatorTaxBps: 0,
    buybackEnabled: false,
    expectedEconomics,
    salt: randomSalt(),
  };

  const wallet = walletClientFor(account);
  const hash = await wallet.writeContract({
    address: factory,
    abi: FACTORY_ABI,
    functionName: "launchToken",
    args: [params, configId, pairToken],
    value: launchFee,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`launch tx reverted (${hash})`);
  const launched = parseEventLogs({ abi: FACTORY_ABI, eventName: "TokenLaunched", logs: receipt.logs })
    .find((l) => l.address.toLowerCase() === factory.toLowerCase());
  if (!launched) throw new Error(`TokenLaunched event missing (${hash})`);
  return {
    token: launched.args.token.toLowerCase(),
    curve: launched.args.curve.toLowerCase(),
    hash,
    blockNumber: receipt.blockNumber,
    launchFeeWei: launchFee,
  };
}

export async function fetchLaunchFeeWei() {
  return client.readContract({ address: config.ponsFactory, abi: FACTORY_ABI, functionName: "launchFee" });
}

/// Curve progress for display: real ETH raised vs graduation threshold.
export async function curveProgress(curve) {
  const read = (functionName) => client.readContract({ address: curve, abi: CURVE_ABI, functionName });
  const [real, threshold, graduated] = await Promise.all([
    read("realQuoteReserve").catch(() => 0n),
    read("graduationThreshold").catch(() => 0n),
    read("graduated").catch(() => false),
  ]);
  return { real, threshold, graduated };
}

/// Unclaimed creator pot for a coin, in wei: fees still sitting on the curve
/// (waiting for a sweep) + whatever the escrow already credited the wallet.
export async function creatorPotWei(curve, wallet) {
  const [curveFees, curveTax, escrow] = await Promise.all([
    client.readContract({ address: curve, abi: CURVE_ABI, functionName: "quoteFeeBalance" }).catch(() => 0n),
    client.readContract({ address: curve, abi: CURVE_ABI, functionName: "creatorTaxBalance" }).catch(() => 0n),
    client.readContract({ address: config.ponsFeeEscrow, abi: ESCROW_ABI, functionName: "balanceOf", args: [wallet] }),
  ]);
  return { curveWei: curveFees + curveTax, escrowWei: escrow };
}

/// Sweep the curve's accrued fees, then claim this wallet's whole escrow
/// balance. Returns the claimed wei.
export async function sweepAndClaim({ account, curve }) {
  const wallet = walletClientFor(account);
  const txs = [];

  try {
    const pending = await client.readContract({ address: curve, abi: CURVE_ABI, functionName: "quoteFeeBalance" });
    const graduated = await client.readContract({ address: curve, abi: CURVE_ABI, functionName: "graduated" });
    if (!graduated && pending > 0n) {
      const hash = await wallet.writeContract({ address: curve, abi: CURVE_ABI, functionName: "sweepFees", args: [0n] });
      await client.waitForTransactionReceipt({ hash });
      txs.push(hash);
    }
  } catch (err) {
    console.warn(`[pons] sweepFees skipped for ${curve}: ${String(err.shortMessage || err.message).slice(0, 120)}`);
  }

  const owed = await client.readContract({
    address: config.ponsFeeEscrow,
    abi: ESCROW_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (owed > 0n) {
    const hash = await wallet.writeContract({
      address: config.ponsFeeEscrow,
      abi: ESCROW_ABI,
      functionName: "claim",
      args: [owed],
    });
    await client.waitForTransactionReceipt({ hash });
    txs.push(hash);
  }
  return { claimedWei: owed, txs };
}
