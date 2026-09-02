import { config } from "./config.js";

/// Charity catalog — orgs available for direct crypto giving (donate.gg
/// ecosystem + well-known crypto-accepting orgs). Each entry's `address` is
/// the org's payout wallet on Robinhood Chain; entries without one route
/// through the platform giving wallet (CHARITY_PAYOUT_WALLET) until wired.
/// When DONATE_GG_API_KEY is set, the live donate.gg list is merged in.

export const CATALOG = [
  { id: "st-jude", name: "St. Jude Children's Research Hospital", category: "Children & Health", website: "https://www.stjude.org", source: "donate.gg" },
  { id: "make-a-wish", name: "Make-A-Wish Foundation", category: "Children", website: "https://wish.org", source: "donate.gg" },
  { id: "team-water", name: "Team Water", category: "Clean Water", website: "https://teamwater.org", source: "donate.gg" },
  { id: "charity-water", name: "charity: water", category: "Clean Water", website: "https://www.charitywater.org", source: "direct" },
  { id: "save-the-children", name: "Save the Children", category: "Children", website: "https://www.savethechildren.org", source: "direct" },
  { id: "direct-relief", name: "Direct Relief", category: "Humanitarian", website: "https://www.directrelief.org", source: "direct" },
  { id: "givedirectly", name: "GiveDirectly", category: "Global Poverty", website: "https://www.givedirectly.org", source: "direct" },
  { id: "msf", name: "Doctors Without Borders (MSF)", category: "Health", website: "https://www.doctorswithoutborders.org", source: "direct" },
  { id: "american-cancer-society", name: "American Cancer Society", category: "Health", website: "https://www.cancer.org", source: "direct" },
  { id: "wwf", name: "World Wildlife Fund", category: "Environment & Animals", website: "https://www.worldwildlife.org", source: "direct" },
  { id: "rainforest-foundation", name: "Rainforest Foundation US", category: "Environment", website: "https://rainforestfoundation.org", source: "direct" },
  { id: "the-water-project", name: "The Water Project", category: "Clean Water", website: "https://thewaterproject.org", source: "direct" },
  { id: "eff", name: "Electronic Frontier Foundation", category: "Digital Rights", website: "https://www.eff.org", source: "direct" },
  { id: "internet-archive", name: "Internet Archive", category: "Digital Rights", website: "https://archive.org", source: "direct" },
  { id: "unicef", name: "UNICEF", category: "Children & Humanitarian", website: "https://www.unicef.org", source: "direct" },
  { id: "best-friends", name: "Best Friends Animal Society", category: "Animals", website: "https://bestfriends.org", source: "direct" },
];

// Per-org payout addresses, wired via env: CHARITY_ADDR_<ID with - as _> = 0x…
function orgAddress(id) {
  const key = `CHARITY_ADDR_${id.toUpperCase().replace(/-/g, "_")}`;
  return process.env[key] || "";
}

let liveCache = { list: null, ts: 0 };

async function fetchDonateGg() {
  if (!config.donateGgApiKey) return null;
  if (liveCache.list && Date.now() - liveCache.ts < 3_600_000) return liveCache.list;
  try {
    const res = await fetch("https://www.donate.gg/api/v1/charities", {
      headers: { "donate-api-key": config.donateGgApiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return liveCache.list;
    const json = await res.json();
    const arr = Array.isArray(json) ? json : json.charities || json.data || [];
    liveCache = {
      ts: Date.now(),
      list: arr
        .filter((c) => c.isEnabled !== false)
        .map((c) => ({
          id: `dgg-${c.slug || c.id}`,
          name: c.name,
          category: "donate.gg verified",
          website: c.website || `https://donate.gg/${c.slug || ""}`,
          logo: c.logo || "",
          source: "donate.gg",
        })),
    };
    return liveCache.list;
  } catch {
    return liveCache.list;
  }
}

/// Full list for the UI select. Every org is shown; `wired` tells the UI
/// whether it pays the org's own wallet or routes via the giving wallet.
export async function listCharities() {
  const live = (await fetchDonateGg()) || [];
  const seen = new Set();
  const merged = [...CATALOG, ...live.filter((c) => !seen.has(c.name) && seen.add(c.name))];
  return merged.map((c) => ({
    ...c,
    wired: Boolean(orgAddress(c.id) || config.charityPayoutWallet),
  }));
}

/// Resolve a charity into campaign fields. Falls back to the platform giving
/// wallet when the org's own address isn't wired yet.
export async function resolveCharity(id) {
  const all = await listCharities();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  const beneficiary = orgAddress(c.id) || config.charityPayoutWallet;
  if (!beneficiary) return { ...c, beneficiary: null };
  return { ...c, beneficiary };
}
