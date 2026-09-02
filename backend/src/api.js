import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { isAddress } from "viem";
import { sql, logEvent } from "./db.js";
import { config } from "./config.js";
import { getEthPrice } from "./ethprice.js";
import { encryptSecret } from "./crypto.js";
import { newWallet, toEth } from "./evm.js";
import { fetchLaunchFeeWei } from "./pons.js";
import { createCampaignOnChain } from "./fund.js";

export function createApi() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.get("/api/stats", async (_req, res) => {
    try {
      const [agg] = await sql`select
        coalesce(sum(total_raised), 0) as total_raised,
        coalesce(sum(pending), 0) as total_pending,
        count(*) filter (where active) as active_campaigns
        from campaigns`;
      const [don] = await sql`select count(*) as donations, coalesce(sum(amount_usd), 0) as donated_usd from donations`;
      const ethPrice = await getEthPrice();
      res.json({
        totalRaisedEth: Number(agg.total_raised),
        totalPendingEth: Number(agg.total_pending),
        activeCampaigns: Number(agg.active_campaigns),
        donations: Number(don.donations),
        donatedUsd: Number(don.donated_usd),
        ethPriceUsd: ethPrice,
        fundAddress: config.fundAddress,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/campaigns", async (_req, res) => {
    try {
      const rows = await sql`select * from campaigns order by created_at desc`;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "bad id" });
      const [campaign] = await sql`select * from campaigns where id = ${id}`;
      if (!campaign) return res.status(404).json({ error: "not found" });
      const donations = await sql`select * from donations where campaign_id = ${id} order by ts desc limit 100`;
      const deposits = await sql`select * from deposits where campaign_id = ${id} order by detected_at desc limit 100`;
      const launches = await sql`select launch_id, name, symbol, logo, status, mint, curve, launch_tx,
          pending_pot_eth, fees_claimed_eth, fees_donated_eth, curve_progress, graduated, launched_at
        from launches where campaign_id = ${id} and status = 'live' order by launched_at desc`;
      res.json({ campaign, donations, deposits, launches });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/donations", async (_req, res) => {
    try {
      const rows = await sql`select d.*, c.name as campaign_name from donations d
        join campaigns c on c.id = d.campaign_id
        order by d.ts desc limit 200`;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const after = Number(req.query.after || 0);
      const rows = await sql`select e.*, c.name as campaign_name from events e
        left join campaigns c on c.id = e.campaign_id
        where e.id > ${after}
        order by e.id desc limit 100`;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ------------------------------------------------- charity launchpad

  app.get("/api/launches", async (_req, res) => {
    try {
      const rows = await sql`select l.launch_id, l.campaign_id, l.name, l.symbol, l.logo, l.description,
          l.status, l.mint, l.curve, l.launch_tx, l.pending_pot_eth, l.fees_claimed_eth,
          l.fees_donated_eth, l.curve_progress, l.graduated, l.created_at, l.launched_at,
          c.name as campaign_name
        from launches l join campaigns c on c.id = l.campaign_id
        where l.status in ('live', 'launching')
        order by l.created_at desc limit 100`;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/launches/:id", async (req, res) => {
    try {
      const [row] = await sql`select l.launch_id, l.campaign_id, l.name, l.symbol, l.logo, l.description,
          l.status, l.error, l.mint, l.curve, l.launch_tx, l.refund_tx, l.creator_wallet,
          l.deposit_expected_eth, l.pending_pot_eth, l.fees_claimed_eth, l.fees_donated_eth,
          l.curve_progress, l.graduated, l.created_at, l.launched_at,
          c.name as campaign_name
        from launches l join campaigns c on c.id = l.campaign_id
        where l.launch_id = ${req.params.id}`;
      if (!row) return res.status(404).json({ error: "not found" });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/launches", async (req, res) => {
    try {
      const {
        campaignId, name, symbol, logo, description, website, twitter, telegram, userWallet,
        causeName, causeBeneficiary, causeUrl, causeDescription,
      } = req.body || {};
      if (!name || String(name).trim().length === 0 || String(name).length > 64)
        return res.status(400).json({ error: "name required (max 64 chars)" });
      const sym = String(symbol || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{1,10}$/.test(sym)) return res.status(400).json({ error: "symbol: 1-10 letters/digits" });
      if (!userWallet || !isAddress(userWallet)) return res.status(400).json({ error: "userWallet: valid address required (refund destination)" });

      // The cause is created right here: either reuse an existing campaign id,
      // or register a new one on-chain from the cause fields in the same flow.
      let campaign;
      if (Number.isInteger(campaignId)) {
        [campaign] = await sql`select id, name, active from campaigns where id = ${campaignId}`;
        if (!campaign) return res.status(404).json({ error: "campaign not found" });
        if (!campaign.active) return res.status(400).json({ error: "campaign is paused" });
      } else {
        if (!causeName || String(causeName).trim().length === 0 || String(causeName).length > 80)
          return res.status(400).json({ error: "causeName required (max 80 chars)" });
        if (!causeBeneficiary || !isAddress(causeBeneficiary))
          return res.status(400).json({ error: "causeBeneficiary: valid address required" });
        const created = await createCampaignOnChain({
          name: String(causeName).trim(),
          description: String(causeDescription || "").slice(0, 500),
          causeUrl: String(causeUrl || "").slice(0, 300),
          beneficiary: causeBeneficiary,
        });
        // Insert directly (the indexer's `on conflict do nothing` makes this safe)
        await sql`insert into campaigns (id, creator, beneficiary, vault, name, metadata_uri, description, cause_url, tx_hash)
          values (${created.id}, 'launchpad', ${causeBeneficiary.toLowerCase()}, ${created.vault},
            ${String(causeName).trim()}, ${created.metadataURI}, ${String(causeDescription || "").slice(0, 500)},
            ${String(causeUrl || "").slice(0, 300)}, ${created.txHash})
          on conflict (id) do nothing`;
        campaign = { id: created.id, name: String(causeName).trim() };
      }

      const launchFeeEth = await fetchLaunchFeeWei().then(toEth).catch(() => 0.0005);
      const depositExpected = Number((launchFeeEth + config.launchGasEth).toFixed(6));

      const wallet = newWallet();
      const launchId = crypto.randomBytes(10).toString("hex");
      await sql`insert into launches
        (launch_id, campaign_id, name, symbol, logo, description, website, twitter, telegram,
         user_wallet, deposit_expected_eth, creator_wallet, creator_secret_enc)
        values (${launchId}, ${campaign.id}, ${String(name).trim()}, ${sym},
          ${String(logo || "").slice(0, 500)}, ${String(description || "").slice(0, 1000)},
          ${String(website || "").slice(0, 300)}, ${String(twitter || "").slice(0, 300)}, ${String(telegram || "").slice(0, 300)},
          ${userWallet.toLowerCase()}, ${depositExpected}, ${wallet.address.toLowerCase()}, ${encryptSecret(wallet.secret)})`;

      await logEvent("launch_created", campaign.id, `$${sym} launch created — awaiting ${depositExpected} ETH deposit`, {
        symbol: sym,
        launchId,
      });

      res.json({
        launchId,
        depositAddress: wallet.address,
        depositExpectedEth: depositExpected,
        timeoutMin: config.depositTimeoutMin,
      });
    } catch (err) {
      console.error("[api/launches] error:", err);
      res.status(500).json({ error: "failed to create launch" });
    }
  });

  return app;
}
