import { defineChain } from "viem";

export const robinhoodChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const FUND_ADDRESS = (process.env.NEXT_PUBLIC_FUND_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER || "https://robinhoodchain.blockscout.com";
export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4100";
