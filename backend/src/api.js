import express from "express";
import cors from "cors";
import { sql } from "./db.js";
import { config } from "./config.js";
import { getEthPrice } from "./ethprice.js";

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
      res.json({ campaign, donations, deposits });
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

  return app;
}
