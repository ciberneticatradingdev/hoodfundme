import "dotenv/config";

export const config = {
  rpcUrl: process.env.RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
  chainId: Number(process.env.CHAIN_ID || 4663),
  fundAddress: (process.env.FUND_ADDRESS || "").toLowerCase(),
  startBlock: process.env.START_BLOCK ? BigInt(process.env.START_BLOCK) : null,
  databaseUrl: process.env.DATABASE_URL || "postgres://localhost:5432/hoodfundme",
  port: Number(process.env.PORT || 4100),
  pollMs: Number(process.env.POLL_MS || 5000),
  logChunk: BigInt(process.env.LOG_CHUNK || 5000),
  // keeper: flushes vaults that hold >= threshold. Optional — anyone can flush.
  keeperPk: process.env.KEEPER_PK || "",
  keeperIntervalMs: Number(process.env.KEEPER_INTERVAL_MS || 60000),
  flushThresholdEth: Number(process.env.FLUSH_THRESHOLD_ETH || 0.005),
  ethPriceRefreshMs: Number(process.env.ETH_PRICE_REFRESH_MS || 300000),
};
