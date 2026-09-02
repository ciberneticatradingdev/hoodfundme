import { parseEventLogs, formatEther } from "viem";
import { config } from "./config.js";
import { sql, getMeta, setMeta, logEvent } from "./db.js";
import { fundEventsAbi } from "./abi.js";
import { getEthPrice } from "./ethprice.js";
import { client } from "./evm.js";

export { client };

const fromWei = (v) => Number(formatEther(v));

async function applyMetadata(id, uri) {
  if (!/^https?:\/\//.test(uri) && !uri.startsWith("data:")) return;
  try {
    let json;
    if (uri.startsWith("data:application/json;base64,")) {
      json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    } else {
      const res = await fetch(uri, { signal: AbortSignal.timeout(4000) });
      json = await res.json();
    }
    await sql`update campaigns set
      description = ${String(json.description || "")},
      image = ${String(json.image || "")},
      cause_url = ${String(json.causeUrl || json.cause_url || "")}
      where id = ${id}`;
  } catch {
    // metadata is best-effort
  }
}

async function blockTimesFor(logs) {
  const times = new Map();
  for (const bn of new Set(logs.map((l) => l.blockNumber))) {
    const b = await client.getBlock({ blockNumber: bn });
    times.set(bn, b.timestamp);
  }
  return times;
}

async function handleLogs(logs) {
  const blockTimes = await blockTimesFor(logs);
  const ethPrice = await getEthPrice();

  for (const log of logs) {
    const ts = new Date(Number(blockTimes.get(log.blockNumber)) * 1000);

    if (log.eventName === "CampaignCreated") {
      const { id, creator, beneficiary, vault, name, metadataURI } = log.args;
      const cid = Number(id);
      await sql`insert into campaigns (id, creator, beneficiary, vault, name, metadata_uri, created_at, tx_hash)
        values (${cid}, ${creator.toLowerCase()}, ${beneficiary.toLowerCase()}, ${vault.toLowerCase()}, ${name}, ${metadataURI}, ${ts}, ${log.transactionHash})
        on conflict (id) do nothing`;
      await applyMetadata(cid, metadataURI);
      await logEvent("campaign_created", cid, `Campaign "${name}" created — vault ${vault}`, {
        vault, beneficiary, txHash: log.transactionHash,
      });
      console.log(`[indexer] campaign #${cid} "${name}" vault ${vault}`);
    }

    if (log.eventName === "Donated") {
      const { id, amount, beneficiary } = log.args;
      const cid = Number(id);
      const eth = fromWei(amount);
      const usd = ethPrice > 0 ? eth * ethPrice : null;
      const inserted = await sql`insert into donations (campaign_id, amount, amount_usd, beneficiary, tx_hash, log_index, block, ts)
        values (${cid}, ${eth}, ${usd}, ${beneficiary.toLowerCase()}, ${log.transactionHash}, ${log.logIndex}, ${Number(log.blockNumber)}, ${ts})
        on conflict (tx_hash, log_index) do nothing returning id`;
      if (inserted.length === 0) continue;
      await sql`update campaigns set total_raised = total_raised + ${eth} where id = ${cid}`;
      await logEvent("donated", cid, `${eth.toFixed(6)} ETH paid out to beneficiary`, {
        amountEth: eth, amountUsd: usd, beneficiary, txHash: log.transactionHash,
      });
      console.log(`[indexer] donation #${cid} ${eth} ETH → ${beneficiary}`);
    }

    if (log.eventName === "BeneficiaryUpdated") {
      const { id, beneficiary } = log.args;
      await sql`update campaigns set beneficiary = ${beneficiary.toLowerCase()} where id = ${Number(id)}`;
      await logEvent("beneficiary_updated", Number(id), `Beneficiary updated to ${beneficiary}`);
    }

    if (log.eventName === "ActiveSet") {
      const { id, active } = log.args;
      await sql`update campaigns set active = ${active} where id = ${Number(id)}`;
      await logEvent("active_set", Number(id), active ? "Campaign activated" : "Campaign paused");
    }
  }
}

/** Poll vault balances so pending deposits show up in real time. */
async function pollVaults() {
  const rows = await sql`select id, vault, pending from campaigns`;
  for (const r of rows) {
    try {
      const bal = fromWei(await client.getBalance({ address: r.vault }));
      const prev = Number(r.pending);
      if (Math.abs(bal - prev) < 1e-12) continue;
      await sql`update campaigns set pending = ${bal} where id = ${r.id}`;
      if (bal > prev + 1e-12) {
        const delta = bal - prev;
        await sql`insert into deposits (campaign_id, amount) values (${r.id}, ${delta})`;
        await logEvent("fee_received", r.id, `${delta.toFixed(6)} ETH received in vault`, {
          amountEth: delta, vault: r.vault,
        });
        console.log(`[indexer] deposit #${r.id} +${delta} ETH (vault ${bal})`);
      }
    } catch (err) {
      console.warn(`[indexer] balance poll failed for #${r.id}:`, err.message);
    }
  }
}

async function tick() {
  const latest = await client.getBlockNumber();
  const stored = await getMeta("last_block");
  let last = stored !== null ? BigInt(stored) : (config.startBlock ?? latest - 1n);

  while (last < latest) {
    const from = last + 1n;
    const to = from + config.logChunk > latest ? latest : from + config.logChunk;
    const raw = await client.getLogs({ address: config.fundAddress, fromBlock: from, toBlock: to });
    const logs = parseEventLogs({ abi: fundEventsAbi, logs: raw });
    if (logs.length > 0) await handleLogs(logs);
    last = to;
    await setMeta("last_block", last);
  }

  await pollVaults();
}

export function startIndexer() {
  if (!config.fundAddress) {
    console.warn("[indexer] idle: no FUND_ADDRESS");
    return;
  }
  console.log(`[indexer] watching ${config.fundAddress} on ${config.rpcUrl}`);
  const loop = async () => {
    try {
      await tick();
    } catch (err) {
      console.warn("[indexer] tick failed:", err.message);
    }
    setTimeout(loop, config.pollMs);
  };
  loop();
}
