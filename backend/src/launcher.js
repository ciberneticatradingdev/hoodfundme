import { sql, logEvent } from "./db.js";
import { config } from "./config.js";
import { decryptSecret } from "./crypto.js";
import { accountFromSecret, client, getEthBalance, getEthBalanceWei, sendEth, toEth, toWei } from "./evm.js";
import { launchCoin } from "./pons.js";

/// Watches awaiting_deposit launches; once the user's ETH lands in the fresh
/// custodial wallet it launches the coin on pons (Robinhood Chain) with the
/// custodial wallet as creatorFeeRecipient — so every creator fee is reserved
/// for the linked charity campaign. We hold the key; the launch is perfect by
/// construction. Failed launches refund the user automatically.

let running = false;

export function startLauncher() {
  setInterval(tick, 5_000);
  console.log("[launcher] watching deposits every 5s");
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await expireStale();
    const rows = await sql`select * from launches where status = 'awaiting_deposit' order by created_at asc limit 20`;
    for (const row of rows) {
      const balance = await getEthBalance(row.creator_wallet).catch(() => 0);
      if (balance + 1e-12 >= row.deposit_expected_eth) {
        await sql`update launches set status = 'launching' where launch_id = ${row.launch_id} and status = 'awaiting_deposit'`;
        launch(row).catch(async (err) => {
          console.error(`[launcher] ${row.launch_id} failed:`, err.message);
          await sql`update launches set status = 'failed', error = ${String(err.message).slice(0, 500)}
            where launch_id = ${row.launch_id}`;
          await refundDeposit(row).catch((e) => console.error(`[launcher] refund ${row.launch_id} failed:`, e.message));
        });
      }
    }
  } catch (err) {
    console.error("[launcher] tick error:", err.message);
  } finally {
    running = false;
  }
}

async function expireStale() {
  await sql`update launches set status = 'expired'
    where status = 'awaiting_deposit' and created_at < now() - make_interval(mins => ${config.depositTimeoutMin})`;
}

/// A failed launch never keeps the user's ETH: empty the custodial wallet
/// back to the user, minus the gas for the refund transfer itself.
async function refundDeposit(row) {
  const account = accountFromSecret(decryptSecret(row.creator_secret_enc));
  const balance = await getEthBalanceWei(account.address);
  const gasPrice = await client.getGasPrice();
  const fee = 21_000n * gasPrice * 2n; // headroom for base-fee drift
  const refund = balance - fee;
  if (refund <= 0n) return;
  const hash = await sendEth({ account, to: row.user_wallet, valueWei: refund });
  await sql`update launches set status = 'refunded', refund_tx = ${hash} where launch_id = ${row.launch_id}`;
  console.log(`[launcher] refunded ${toEth(refund).toFixed(6)} ETH → ${row.user_wallet} (${hash})`);
}

async function launch(row) {
  const account = accountFromSecret(decryptSecret(row.creator_secret_enc));
  console.log(`[launcher] launching "${row.name}" ($${row.symbol}) for campaign #${row.campaign_id} from ${row.creator_wallet}`);

  const { token, curve, hash } = await launchCoin({
    account,
    name: row.name,
    symbol: row.symbol,
    logo: row.logo,
    description: row.description,
    // the coin's canonical website is its page on hoodfundme
    website: `${config.siteUrl}/t/${row.launch_id}`,
    twitter: row.twitter,
    telegram: row.telegram,
    // dev buy rides in the same tx via the launch-and-buy router; the tokens
    // land straight in the user's own wallet
    devBuyWei: toWei(row.dev_buy_eth || 0),
    devBuyRecipient: row.user_wallet,
  });

  await sql`update launches set
      mint = ${token},
      curve = ${curve},
      launch_tx = ${hash},
      status = 'live',
      launched_at = now()
    where launch_id = ${row.launch_id}`;

  await logEvent("token_launched", row.campaign_id, `$${row.symbol} launched for this cause — every creator fee flows to the campaign`, {
    mint: token,
    curve,
    txHash: hash,
    symbol: row.symbol,
    name: row.name,
  });
  console.log(`[launcher] $${row.symbol} live: ${token} (curve ${curve}, ${hash}) ✅`);
}
