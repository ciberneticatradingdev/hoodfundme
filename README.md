# HoodFundMe

Trustless donation flywheel on **Robinhood Chain** (EVM L2, chain id 4663).
Every campaign gets its own on-chain vault address — point any fee stream at it
(token creator fees, trading revenue, tips) and the smart contract forwards
**100% to the cause, automatically**. No custody, no cards, no middlemen,
0% commission enforced by code.

Successor to [PumpFundMe](https://github.com/ciberneticatradingdev/pumpfundme):
the GoFundMe card-payment step could never be automated, so here the entire
payout rail is on-chain.

## Architecture

```
contracts/   Foundry — HoodFund.sol (campaign registry + per-campaign Vaults)
backend/     Express + Postgres — event indexer, vault balance poller, flush keeper, REST API
web/         Next.js + wagmi/viem — frontend (Vercel)
```

### How it works

- `createCampaign(name, metadataURI, beneficiary)` registers a campaign and
  deploys a dedicated `Vault` contract (CREATE2). The vault accepts ETH from anyone.
- `flush(id)` forwards the vault's full balance to the beneficiary and emits
  `Donated`. **Anyone** can call it — the backend keeper just does it on a timer
  (threshold `FLUSH_THRESHOLD_ETH`, keeper wallet pays gas only, never holds funds).
- `donate(id)` lets a wallet donate directly (vault + flush in one tx).
- Campaign metadata (description, cause link) travels on-chain as a base64
  `data:` URI — no server dependency for campaign creation.
- The backend indexes `CampaignCreated` / `Donated` / `BeneficiaryUpdated` /
  `ActiveSet` logs, polls vault balances to surface pending deposits in real
  time, and serves the public REST API that powers the site + live terminal.

## Local development

```bash
# 1. Postgres
createdb hoodfundme

# 2. Local chain (HoodFund has no external deps — plain anvil works)
anvil --chain-id 4663 --block-time 2

# 3. Deploy (anvil key 0)
cd contracts
DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 4. Backend (set FUND_ADDRESS + START_BLOCK in backend/.env)
cd backend && npm install && npm run dev

# 5. Web
cd web && npm install && npm run dev
```

## Tests

```bash
cd contracts && forge test
```

## Deploy (mainnet)

```bash
cd contracts
DEPLOYER_PK=<funded key> forge script script/Deploy.s.sol \
  --rpc-url https://rpc.mainnet.chain.robinhood.com --broadcast
```

Then set `FUND_ADDRESS` + `START_BLOCK` in the backend (Railway) and
`NEXT_PUBLIC_FUND_ADDRESS` in the web (Vercel).
