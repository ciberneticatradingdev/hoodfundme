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
  kind?: string;
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

export interface Charity {
  id: string;
  name: string;
  category: string;
  website: string;
  logo?: string;
  description?: string;
  location?: string;
  source: string;
  wired: boolean;
}

export interface GofundmePreview {
  url: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  scraped: boolean;
}

export interface Launch {
  launch_id: string;
  campaign_id: number;
  campaign_name?: string;
  campaign_kind?: string;
  campaign_cause_url?: string;
  twitter?: string;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  status: string;
  error?: string | null;
  mint: string | null;
  curve: string | null;
  launch_tx: string | null;
  refund_tx?: string | null;
  creator_wallet?: string;
  deposit_expected_eth?: number;
  pending_pot_eth: number;
  fees_claimed_eth: number;
  fees_donated_eth: number;
  curve_progress: number;
  graduated: boolean;
  created_at: string;
  launched_at: string | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export const fetchStats = () => get<Stats>("/api/stats");
export const fetchCampaigns = () => get<Campaign[]>("/api/campaigns");
export const fetchCampaign = (id: number) =>
  get<{ campaign: Campaign; donations: Donation[]; deposits: { amount: number; detected_at: string }[]; launches: Launch[] }>(
    `/api/campaigns/${id}`
  );
export const fetchLaunches = () => get<Launch[]>("/api/launches");
export const fetchCharities = () => get<Charity[]>("/api/charities");
export const fetchGofundmePreview = (url: string) =>
  get<GofundmePreview>(`/api/gofundme/preview?url=${encodeURIComponent(url)}`);

export async function uploadLogo(dataUrl: string): Promise<{ id: string; url: string }> {
  const res = await fetch(`${BACKEND}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `upload failed (${res.status})`);
  return json;
}
export const fetchLaunch = (id: string) => get<Launch>(`/api/launches/${id}`);
export async function createLaunch(input: {
  campaignId?: number;
  name: string;
  symbol: string;
  logo?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  causeName?: string;
  causeBeneficiary?: string;
  causeUrl?: string;
  causeDescription?: string;
  charityId?: string;
  gofundmeUrl?: string;
  userWallet: string;
}): Promise<{ launchId: string; depositAddress: string; depositExpectedEth: number; timeoutMin: number }> {
  const res = await fetch(`${BACKEND}/api/launches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `launch failed (${res.status})`);
  return json;
}
export const fetchDonations = () => get<Donation[]>("/api/donations");
export const fetchEvents = (after = 0) => get<FeedEvent[]>(`/api/events?after=${after}`);
