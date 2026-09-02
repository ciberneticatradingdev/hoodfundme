import { BACKEND } from "./chain";

export interface Stats {
  totalRaisedEth: number;
  totalPendingEth: number;
  activeCampaigns: number;
  donations: number;
  donatedUsd: number;
  ethPriceUsd: number;
  fundAddress: string;
}

export interface Campaign {
  id: number;
  creator: string;
  beneficiary: string;
  vault: string;
  name: string;
  metadata_uri: string;
  description: string;
  image: string;
  cause_url: string;
  total_raised: number;
  pending: number;
  active: boolean;
  created_at: string;
  tx_hash: string;
}

export interface Donation {
  id: number;
  campaign_id: number;
  campaign_name?: string;
  amount: number;
  amount_usd: number | null;
  beneficiary: string;
  tx_hash: string;
  block: number;
  ts: string;
}

export interface FeedEvent {
  id: number;
  type: string;
  campaign_id: number | null;
  campaign_name: string | null;
  message: string;
  data: Record<string, unknown> | null;
  ts: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export const fetchStats = () => get<Stats>("/api/stats");
export const fetchCampaigns = () => get<Campaign[]>("/api/campaigns");
export const fetchCampaign = (id: number) =>
  get<{ campaign: Campaign; donations: Donation[]; deposits: { amount: number; detected_at: string }[] }>(
    `/api/campaigns/${id}`
  );
export const fetchDonations = () => get<Donation[]>("/api/donations");
export const fetchEvents = (after = 0) => get<FeedEvent[]>(`/api/events?after=${after}`);
