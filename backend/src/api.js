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
import { listCharities, resolveCharity } from "./charities.js";

export function createApi() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "3mb" }));

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

  app.get("/api/charities", async (_req, res) => {
    try {
      res.json(await listCharities());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ------------------------------------------------- logo uploads (DB-backed)

  app.post("/api/uploads", async (req, res) => {
    try {
      const { dataUrl } = req.body || {};
      const m = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
      if (!m) return res.status(400).json({ error: "dataUrl must be a base64 png/jpeg/webp/gif" });
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 1_500_000) return res.status(400).json({ error: "image too large (max 1.5MB)" });
      if (buf.length < 100) return res.status(400).json({ error: "empty image" });
      const id = crypto.randomBytes(12).toString("hex");
      await sql`insert into uploads (id, mime, data) values (${id}, ${m[1]}, ${buf})`;
      res.json({ id, url: `${config.publicApiUrl}/api/uploads/${id}` });
    } catch (err) {
      console.error("[api/uploads] error:", err.message);
      res.status(500).json({ error: "upload failed" });
    }
  });

  app.get("/api/uploads/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!/^[a-f0-9]{24}$/.test(id)) return res.status(400).end();
      const [row] = await sql`select mime, data from uploads where id = ${id}`;
      if (!row) return res.status(404).end();
      res.set("Content-Type", row.mime);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.send(Buffer.from(row.data));
    } catch {
      res.status(500).end();
    }
  });

  // ------------------------------------------------- gofundme preview scraper

  const gfPreviewCache = new Map();

  app.get("/api/gofundme/preview", async (req, res) => {
    try {
      const url = String(req.query.url || "").trim();
      if (!/^https:\/\/(www\.)?gofundme\.com\/f\/[A-Za-z0-9-]+\/?($|\?)/.test(url))
        return res.status(400).json({ error: "invalid gofundme url" });
      const clean = url.split("?")[0].replace(/\/$/, "");
      const cached = gfPreviewCache.get(clean);
      if (cached && Date.now() - cached.ts < 3_600_000) return res.json(cached.data);

      const html = await fetch(clean, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(9000),
      }).then((r) => (r.ok ? r.text() : null));

      const meta = (prop) => {
        if (!html) return "";
        const re1 = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
        const re2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, "i");
        const m = re1.exec(html) || re2.exec(html);
        return m ? m[1] : "";
      };
      const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

      const slug = clean.match(/\/f\/([A-Za-z0-9-]+)/)[1];
      const data = {
        url: clean,
        slug,
        title: decode(meta("og:title")) || slug.replace(/-/g, " "),
        description: decode(meta("og:description")).slice(0, 300),
        image: meta("og:image"),
        scraped: Boolean(html),
      };
      gfPreviewCache.set(clean, { ts: Date.now(), data });
      if (gfPreviewCache.size > 500) gfPreviewCache.clear();
      res.json(data);
    } catch (err) {
      console.warn("[api/gofundme] preview failed:", err.message);
      res.status(502).json({ error: "could not fetch gofundme page" });
    }
  });

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
          l.twitter, l.status, l.error, l.mint, l.curve, l.launch_tx, l.refund_tx, l.creator_wallet,
          l.deposit_expected_eth, l.pending_pot_eth, l.fees_claimed_eth, l.fees_donated_eth,
          l.curve_progress, l.graduated, l.created_at, l.launched_at,
          c.name as campaign_name, c.kind as campaign_kind, c.cause_url as campaign_cause_url
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
        charityId, gofundmeUrl, devBuyEth,
      } = req.body || {};
      const devBuy = Number(devBuyEth) || 0;
      if (devBuy < 0 || devBuy > 10 || !isFinite(devBuy))
        return res.status(400).json({ error: "devBuyEth: 0 to 10 ETH" });
      if (!name || String(name).trim().length === 0 || String(name).length > 64)
        return res.status(400).json({ error: "name required (max 64 chars)" });
      const sym = String(symbol || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{1,10}$/.test(sym)) return res.status(400).json({ error: "symbol: 1-10 letters/digits" });
      if (!userWallet || !isAddress(userWallet)) return res.status(400).json({ error: "userWallet: valid address required (refund destination)" });
      if (!logo || !/^https?:\/\//.test(String(logo))) return res.status(400).json({ error: "logo required — upload an image first" });

      // optional X link: accept @handle, handle, or full URL
      let xUrl = String(twitter || "").trim();
      if (xUrl && !/^https?:\/\//.test(xUrl)) {
        const handle = xUrl.replace(/^@/, "");
        if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return res.status(400).json({ error: "twitter: use @handle or a full URL" });
        xUrl = `https://x.com/${handle}`;
      }

      // The cause is created right here. Three ways in:
      //   charityId    → verified org, direct crypto transfer (donate.gg et al)
      //   gofundmeUrl  → GoFundMe campaign; grokbot runs the deposits every 6h
      //   campaignId   → reuse an existing cause
      let campaign;
      if (Number.isInteger(campaignId)) {
        [campaign] = await sql`select id, name, active from campaigns where id = ${campaignId}`;
        if (!campaign) return res.status(404).json({ error: "campaign not found" });
        if (!campaign.active) return res.status(400).json({ error: "campaign is paused" });
      } else {
        let cause;
        if (charityId) {
          const charity = await resolveCharity(String(charityId));
          if (!charity) return res.status(404).json({ error: "charity not found" });
          if (!charity.beneficiary)
            return res.status(400).json({ error: "this charity's payout wallet isn't wired yet" });
          cause = {
            kind: "org",
            name: charity.name,
            beneficiary: charity.beneficiary,
            url: charity.website,
            description: `Direct crypto giving to ${charity.name} (${charity.category}).`,
          };
        } else if (gofundmeUrl) {
          const gf = String(gofundmeUrl).trim();
          if (!/^https:\/\/(www\.)?gofundme\.com\/f\/[A-Za-z0-9-]+\/?/.test(gf))
            return res.status(400).json({ error: "gofundmeUrl: must look like https://www.gofundme.com/f/<slug>" });
          if (!config.gofundmePayoutWallet || !isAddress(config.gofundmePayoutWallet))
            return res.status(503).json({ error: "GoFundMe mode not configured (GOFUNDME_PAYOUT_WALLET)" });
          const slug = gf.match(/\/f\/([A-Za-z0-9-]+)/)[1];
          const clean = gf.split("?")[0].replace(/\/$/, "");
          const preview = gfPreviewCache.get(clean)?.data;
          cause = {
            kind: "gofundme",
            name: (preview?.title || `GoFundMe: ${slug.replace(/-/g, " ")}`).slice(0, 78),
            beneficiary: config.gofundmePayoutWallet,
            url: clean,
            description: (preview?.description || "") +
              (preview?.description ? " — " : "") +
              "Deposits are made to this GoFundMe every 6 hours, executed automatically by grokbot.",
          };
        } else {
          if (!causeName || String(causeName).trim().length === 0 || String(causeName).length > 80)
            return res.status(400).json({ error: "causeName required (max 80 chars)" });
          if (!causeBeneficiary || !isAddress(causeBeneficiary))
            return res.status(400).json({ error: "causeBeneficiary: valid address required" });
          cause = {
            kind: "custom",
            name: String(causeName).trim(),
            beneficiary: causeBeneficiary,
            url: String(causeUrl || "").slice(0, 300),
            description: String(causeDescription || "").slice(0, 500),
          };
        }

        const created = await createCampaignOnChain({
          name: cause.name,
          description: cause.description,
          causeUrl: cause.url,
          beneficiary: cause.beneficiary,
        });
        // Insert directly (the indexer's `on conflict do nothing` makes this safe)
        await sql`insert into campaigns (id, creator, beneficiary, vault, name, metadata_uri, description, cause_url, tx_hash, kind)
          values (${created.id}, 'launchpad', ${cause.beneficiary.toLowerCase()}, ${created.vault},
            ${cause.name}, ${created.metadataURI}, ${cause.description},
            ${cause.url}, ${created.txHash}, ${cause.kind})
          on conflict (id) do nothing`;
        campaign = { id: created.id, name: cause.name };
      }

      const launchFeeEth = await fetchLaunchFeeWei().then(toEth).catch(() => 0.0005);
      const depositExpected = Number((launchFeeEth + config.launchGasEth + devBuy).toFixed(6));

      const wallet = newWallet();
      const launchId = crypto.randomBytes(10).toString("hex");
      await sql`insert into launches
        (launch_id, campaign_id, name, symbol, logo, description, website, twitter, telegram,
         user_wallet, dev_buy_eth, deposit_expected_eth, creator_wallet, creator_secret_enc)
        values (${launchId}, ${campaign.id}, ${String(name).trim()}, ${sym},
          ${String(logo || "").slice(0, 500)}, ${String(description || "").slice(0, 1000)},
          ${String(website || "").slice(0, 300)}, ${xUrl.slice(0, 300)}, ${String(telegram || "").slice(0, 300)},
          ${userWallet.toLowerCase()}, ${devBuy}, ${depositExpected}, ${wallet.address.toLowerCase()}, ${encryptSecret(wallet.secret)})`;

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
