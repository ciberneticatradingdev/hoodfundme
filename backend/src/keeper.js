import { parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { client, walletClientFor } from "./evm.js";
import { config } from "./config.js";
import { sql, logEvent } from "./db.js";
import { fundAbi } from "./abi.js";

/**
 * Keeper: calls flushMany() for vaults holding >= FLUSH_THRESHOLD_ETH.
 * The contract lets ANYONE flush — the keeper is a convenience, not a privilege.
 * Its wallet only pays gas; it never touches donated funds.
 */
export function startKeeper() {
  if (!config.keeperPk) {
    console.warn("[keeper] idle: no KEEPER_PK (flushes must be triggered manually)");
    return;
  }
  if (!config.fundAddress) return;

  const account = privateKeyToAccount(config.keeperPk);
  const base = walletClientFor(account);
  const wallet = {
    getBalance: (args) => client.getBalance(args),
    writeContract: (args) => base.writeContract(args),
    waitForTransactionReceipt: (args) => client.waitForTransactionReceipt(args),
  };

  console.log(`[keeper] active: ${account.address} | threshold ${config.flushThresholdEth} ETH | every ${config.keeperIntervalMs}ms`);

  const thresholdWei = parseEther(String(config.flushThresholdEth));

  const cycle = async () => {
    try {
      const rows = await sql`select id, vault, name from campaigns where active = true`;
      const ready = [];
      for (const r of rows) {
        const bal = await wallet.getBalance({ address: r.vault });
        if (bal >= thresholdWei) ready.push(r);
      }
      if (ready.length === 0) return;

      const ids = ready.map((r) => BigInt(r.id));
      console.log(`[keeper] flushing ${ready.length} campaign(s): ${ready.map((r) => `#${r.id}`).join(", ")}`);

      const hash = await wallet.writeContract({
        address: config.fundAddress,
        abi: fundAbi,
        functionName: "flushMany",
        args: [ids],
        chain: null,
      });
      const receipt = await wallet.waitForTransactionReceipt({ hash });
      console.log(`[keeper] flush tx ${hash} → ${receipt.status}`);
      if (receipt.status !== "success") {
        await logEvent("keeper_error", null, `Flush tx reverted: ${hash}`);
      }
      // Donated events from this tx are picked up by the indexer.
    } catch (err) {
      console.warn("[keeper] cycle failed:", err.message);
    }
  };

  cycle();
  setInterval(cycle, config.keeperIntervalMs);
}
