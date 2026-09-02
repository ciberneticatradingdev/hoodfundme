import { config } from "./config.js";

let price = 0;
let lastFetch = 0;

export async function getEthPrice() {
  if (Date.now() - lastFetch < config.ethPriceRefreshMs && price > 0) return price;
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) }
    );
    const json = await res.json();
    const p = Number(json?.ethereum?.usd);
    if (p > 0) {
      price = p;
      lastFetch = Date.now();
    }
  } catch {
    // keep last known price
  }
  return price;
}
