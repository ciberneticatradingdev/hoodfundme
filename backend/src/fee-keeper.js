import { sql, logEvent } from "./db.js";
import { config } from "./config.js";
import { decryptSecret } from "./crypto.js";
import { accountFromSecret, client, getEthBalanceWei, sendEth, toEth, toWei } from "./evm.js";
import { creatorPotWei, curveProgress, sweepAndClaim } from "./pons.js";

/// The charity engine. Every cycle, per live coin:
///   pot = fees accrued on the curve (unswept) + the wallet's fee-escrow balance
///   if pot >= MIN_CLAIM: sweep the curve + claim the escrow → ETH lands in the
///   custodial wallet → forward everything (minus a permanent gas reserve) to
///   the campaign's HoodFund vault. The vault keeper then flushes it to the
///   beneficiary. Every hop is a public transaction.

let running = false;

export function startFeeKeeper() {
  setInterval(tick, config.feeKeeperMs);
  setTimeout(tick, 20_000);
  console.log(`[fee-keeper] claiming creator fees every ${config.feeKeeperMs / 1000}s (min ${config.minClaimEth} ETH)`);
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const rows = await sql`select l.*, c.vault, c.name as campaign_name
      from launches l join campaigns c on c.id = l.campaign_id
      where l.status = 'live'`;
    for (const row of rows) {
      await processCoin(row).catch((err) => console.error(`[fee-keeper] ${row.symbol}:`, err.message));
    }
  } finally {
    running = false;
  }
}

async function processCoin(row) {
  // refresh curve progress for the UI
  const prog = await curveProgress(row.curve);
  const progress = prog.threshold > 0n ? Number(prog.real) / Number(prog.threshold) : 0;
  await sql`update launches set curve_progress = ${Math.min(1, progress)}, graduated = ${prog.graduated}
    where launch_id = ${row.launch_id}`;

  const pot = await creatorPotWei(row.curve, row.creator_wallet);
  const potEth = toEth(pot.curveWei + pot.escrowWei);
  await sql`update launches set pending_pot_eth = ${potEth} where launch_id = ${row.launch_id}`;
  if (potEth < config.minClaimEth) return;

  console.log(`[fee-keeper] 💰 $${row.symbol}: sweeping ~${potEth.toFixed(5)} ETH for "${row.campaign_name}"`);
  const account = accountFromSecret(decryptSecret(row.creator_secret_enc));

  // 1. sweep the curve + claim the escrow → ETH lands in the custodial wallet
  const { claimedWei } = await sweepAndClaim({ account, curve: row.curve });
  if (claimedWei > 0n) {
    const claimedEth = toEth(claimedWei);
    await sql`update launches set
        fees_claimed_eth = fees_claimed_eth + ${claimedEth},
        pending_pot_eth = 0,
        last_claim_at = now()
      where launch_id = ${row.launch_id}`;
    await logEvent("fees_claimed", row.campaign_id, `$${row.symbol} creator fees claimed: ${claimedEth.toFixed(6)} ETH`, {
      symbol: row.symbol,
      amountEth: claimedEth,
    });
  }

  // 2. forward the wallet's balance (minus gas reserve) to the campaign vault
  const balance = await getEthBalanceWei(account.address);
  const keep = toWei(config.gasReserveEth);
  const gasPrice = await client.getGasPrice();
  const fee = 21_000n * gasPrice * 2n;
  const forward = balance - keep - fee;
  if (forward > toWei(0.0002)) {
    const hash = await sendEth({ account, to: row.vault, valueWei: forward });
    const forwardEth = toEth(forward);
    await sql`update launches set fees_donated_eth = fees_donated_eth + ${forwardEth} where launch_id = ${row.launch_id}`;
    await logEvent("fees_forwarded", row.campaign_id, `$${row.symbol} → ${forwardEth.toFixed(6)} ETH forwarded to the campaign vault`, {
      symbol: row.symbol,
      amountEth: forwardEth,
      txHash: hash,
      vault: row.vault,
    });
    console.log(`[fee-keeper] ✅ $${row.symbol}: ${forwardEth.toFixed(6)} ETH → vault ${row.vault} (${hash})`);
  }
}
