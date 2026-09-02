import { createPublicClient, createWalletClient, defineChain, fallback, http, formatEther, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";

/// EVM layer — Robinhood Chain via viem. Custodial launch wallets are plain
/// private keys (hex), AES-256-GCM encrypted at rest by crypto.js.

export const robinhoodChain = defineChain({
  id: config.chainId,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: config.rpcUrls } },
});

// Batching folds concurrent JSON-RPC calls together (the official RPC sits
// behind Cloudflare and rate-limits by request count); fallback() hops to the
// next endpoint when one 403s or times out.
const transport = fallback(
  config.rpcUrls.map((url) => http(url, { batch: { wait: 30 }, retryCount: 2 })),
  { rank: false }
);

export const client = createPublicClient({ chain: robinhoodChain, transport });

export function newWallet() {
  const secret = generatePrivateKey();
  const account = privateKeyToAccount(secret);
  return { address: account.address, secret };
}

export function accountFromSecret(secret) {
  return privateKeyToAccount(secret);
}

export function walletClientFor(account) {
  return createWalletClient({ account, chain: robinhoodChain, transport });
}

export async function getEthBalance(address) {
  const wei = await client.getBalance({ address });
  return Number(formatEther(wei));
}

export async function getEthBalanceWei(address) {
  return client.getBalance({ address });
}

/// Plain ETH transfer; returns the tx hash after 1 confirmation.
export async function sendEth({ account, to, valueWei }) {
  const wallet = walletClientFor(account);
  const hash = await wallet.sendTransaction({ to, value: valueWei });
  await client.waitForTransactionReceipt({ hash });
  return hash;
}

export const toEth = (wei) => Number(formatEther(wei));
export const toWei = (eth) => parseEther(String(eth));
