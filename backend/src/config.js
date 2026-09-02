import "dotenv/config";

export const config = {
  // Robinhood Chain (chain id 4663). The official RPC sits behind Cloudflare
  // and intermittently 403s datacenter IPs — ranked fallback list.
  rpcUrls: (process.env.RPC_URLS ||
    [
      process.env.RPC_URL,
      "https://robinhood-rpc.publicnode.com",
      "https://robinhood.rpc.blxrbdn.com",
      "https://rpc.mainnet.chain.robinhood.com",
    ]
      .filter(Boolean)
      .join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  get rpcUrl() {
    return this.rpcUrls[0];
  },
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

  // ------------------------------------------------- charity launchpad (pons)
  ponsFactory: process.env.PONS_FACTORY || "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
  ponsFeeEscrow: process.env.PONS_FEE_ESCROW || "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",
  ponsLaunchConfigId: Number(process.env.PONS_LAUNCH_CONFIG_ID || 0),
  // 32-byte hex key for AES-256-GCM encryption of custodial launch wallets.
  masterKey: process.env.MASTER_KEY || "",
  // network costs kept inside the fresh wallet: pons launch fee (0.0005 ETH),
  // tx gas, and a permanent gas reserve for future sweep/claim/forward txs
  launchGasEth: Number(process.env.LAUNCH_GAS_ETH || 0.003),
  gasReserveEth: Number(process.env.GAS_RESERVE_ETH || 0.0015),
  depositTimeoutMin: Number(process.env.DEPOSIT_TIMEOUT_MIN || 30),
  // fee keeper: sweeps curves + claims escrow + forwards to campaign vaults
  feeKeeperMs: Number(process.env.FEE_KEEPER_MS || 300_000),
  minClaimEth: Number(process.env.MIN_CLAIM_ETH || 0.002),

  // ------------------------------------------------------------ cause modes
  // donate.gg developer API key — when set, the live charity list is merged in
  donateGgApiKey: process.env.DONATE_GG_API_KEY || "",
  // every.org charity API key (self-serve at every.org/charity-api) — when set,
  // nonprofit search over 1M+ orgs is merged into /api/charities
  everyOrgApiKey: process.env.EVERY_ORG_API_KEY || "",
  // platform giving wallet: receives org-mode payouts for charities whose own
  // on-chain address isn't wired yet (CHARITY_ADDR_<ID>=0x…)
  charityPayoutWallet: process.env.CHARITY_PAYOUT_WALLET || "",
  // GoFundMe mode: vault payouts land here; grokbot executes the GoFundMe
  // deposit run every 6 hours
  gofundmePayoutWallet: process.env.GOFUNDME_PAYOUT_WALLET || "",
  // public URL of this backend — used to build absolute upload URLs
  publicApiUrl: process.env.PUBLIC_API_URL || "https://hoodfundme-production.up.railway.app",
  // public URL of the site — every coin's website metadata points to its page here
  siteUrl: process.env.SITE_URL || "https://hoodfundme.vercel.app",
};
