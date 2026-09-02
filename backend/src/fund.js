import { parseAbi, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";
import { client, walletClientFor } from "./evm.js";

/// HoodFund writes from the backend — used by the launch flow to create the
/// cause campaign on-chain in the same breath as the token launch. The keeper
/// wallet signs (it only pays gas; campaigns are just registry entries).

export const FUND_WRITE_ABI = parseAbi([
  "function createCampaign(string name, string metadataURI, address beneficiary) returns (uint256 id, address vault)",
  "event CampaignCreated(uint256 indexed id, address indexed creator, address indexed beneficiary, address vault, string name, string metadataURI)",
]);

export async function createCampaignOnChain({ name, description, causeUrl, beneficiary }) {
  if (!config.keeperPk) throw new Error("KEEPER_PK required to create campaigns");
  const account = privateKeyToAccount(config.keeperPk);
  const wallet = walletClientFor(account);

  const metadata = { description: description || "", causeUrl: causeUrl || "" };
  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

  const hash = await wallet.writeContract({
    address: config.fundAddress,
    abi: FUND_WRITE_ABI,
    functionName: "createCampaign",
    args: [name, uri, beneficiary],
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`createCampaign reverted (${hash})`);
  const created = parseEventLogs({ abi: FUND_WRITE_ABI, eventName: "CampaignCreated", logs: receipt.logs })
    .find((l) => l.address.toLowerCase() === config.fundAddress);
  if (!created) throw new Error(`CampaignCreated event missing (${hash})`);
  return {
    id: Number(created.args.id),
    vault: created.args.vault.toLowerCase(),
    txHash: hash,
    metadataURI: uri,
  };
}
