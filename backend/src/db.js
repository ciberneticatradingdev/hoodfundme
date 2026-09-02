import postgres from "postgres";
import { config } from "./config.js";

export const sql = postgres(config.databaseUrl, { onnotice: () => {} });

export async function initSchema() {
  await sql`create table if not exists meta (
    key text primary key,
    value text not null
  )`;
  await sql`create table if not exists campaigns (
    id integer primary key,
    creator text not null,
    beneficiary text not null,
    vault text not null unique,
    name text not null,
    metadata_uri text not null default '',
    description text not null default '',
    image text not null default '',
    cause_url text not null default '',
    total_raised double precision not null default 0,
    pending double precision not null default 0,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    tx_hash text not null default ''
  )`;
  await sql`create table if not exists deposits (
    id serial primary key,
    campaign_id integer not null references campaigns(id),
    amount double precision not null,
    detected_at timestamptz not null default now()
  )`;
  await sql`create table if not exists donations (
    id serial primary key,
    campaign_id integer not null references campaigns(id),
    amount double precision not null,
    amount_usd double precision,
    beneficiary text not null,
    tx_hash text not null,
    log_index integer not null,
    block bigint not null,
    ts timestamptz not null,
    unique (tx_hash, log_index)
  )`;
  await sql`alter table campaigns add column if not exists kind text not null default 'custom'`;
  await sql`do $$ begin
    if exists (select from information_schema.tables where table_name = 'launches') then
      alter table launches add column if not exists dev_buy_eth double precision not null default 0;
    end if;
  end $$`;
  await sql`create table if not exists launches (
    launch_id text primary key,
    campaign_id integer not null references campaigns(id),
    name text not null,
    symbol text not null,
    logo text not null default '',
    description text not null default '',
    website text not null default '',
    twitter text not null default '',
    telegram text not null default '',
    user_wallet text not null,
    dev_buy_eth double precision not null default 0,
    deposit_expected_eth double precision not null,
    creator_wallet text not null unique,
    creator_secret_enc text not null,
    status text not null default 'awaiting_deposit',
    error text,
    mint text,
    curve text,
    launch_tx text,
    refund_tx text,
    pending_pot_eth double precision not null default 0,
    fees_claimed_eth double precision not null default 0,
    fees_donated_eth double precision not null default 0,
    curve_progress double precision not null default 0,
    graduated boolean not null default false,
    created_at timestamptz not null default now(),
    launched_at timestamptz,
    last_claim_at timestamptz
  )`;
  await sql`create table if not exists uploads (
    id text primary key,
    mime text not null,
    data bytea not null,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists events (
    id serial primary key,
    type text not null,
    campaign_id integer,
    message text not null,
    data jsonb,
    ts timestamptz not null default now()
  )`;
}

/// Boot-time repair for the indexer/API race and historical duplicates:
/// 1. campaigns the indexer inserted first got kind='custom' — restore the
///    real kind from the cause_url
/// 2. launches pointing at a duplicate campaign are repointed to the
///    canonical one (lowest active id per cause identity)
export async function repairCampaigns() {
  await sql`update campaigns set kind = 'gofundme'
    where kind = 'custom' and cause_url like 'https://%gofundme.com/%'`;

  const orgMoves = await sql`update launches l set campaign_id = k.min_id
    from (select min(id) as min_id, lower(name) as ident from campaigns
          where kind = 'org' and active group by lower(name)) k,
         campaigns c
    where c.id = l.campaign_id and c.active and c.kind = 'org'
      and lower(c.name) = k.ident and l.campaign_id <> k.min_id
    returning l.symbol, l.campaign_id`;
  const gfMoves = await sql`update launches l set campaign_id = k.min_id
    from (select min(id) as min_id, cause_url from campaigns
          where kind = 'gofundme' and active group by cause_url) k,
         campaigns c
    where c.id = l.campaign_id and c.active and c.kind = 'gofundme'
      and c.cause_url = k.cause_url and l.campaign_id <> k.min_id
    returning l.symbol, l.campaign_id`;
  for (const m of [...orgMoves, ...gfMoves])
    console.log(`[db] repointed $${m.symbol} to canonical campaign #${m.campaign_id}`);
}

/// Hide duplicate campaigns (same org / same GoFundMe) that never got a live
/// token and hold nothing — keeps the oldest one visible. Runs at boot.
export async function dedupeCampaigns() {
  // An "empty shell" has no live token and holds nothing. Among duplicates
  // of the same cause, shells lose to any campaign with a live token; among
  // shells only, the oldest survives.
  const hidden = await sql`update campaigns c set active = false
    where c.active
      and c.pending < 1e-12
      and not exists (select 1 from launches l where l.campaign_id = c.id and l.status = 'live')
      and exists (
        select 1 from campaigns k
        where k.id <> c.id and k.active and k.kind = c.kind
          and (
            (c.kind = 'org' and lower(k.name) = lower(c.name)) or
            (c.kind = 'gofundme' and k.cause_url = c.cause_url)
          )
          and (
            exists (select 1 from launches l2 where l2.campaign_id = k.id and l2.status = 'live')
            or (
              c.total_raised = 0
              and not exists (select 1 from launches l3 where l3.campaign_id = k.id and l3.status = 'live')
              and k.id < c.id
            )
          )
      )
    returning c.id, c.name`;
  for (const h of hidden) console.log(`[db] hid duplicate campaign #${h.id} "${h.name}"`);
}

export async function getMeta(key) {
  const rows = await sql`select value from meta where key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setMeta(key, value) {
  await sql`insert into meta (key, value) values (${key}, ${String(value)})
    on conflict (key) do update set value = ${String(value)}`;
}

export async function logEvent(type, campaignId, message, data = null) {
  await sql`insert into events (type, campaign_id, message, data)
    values (${type}, ${campaignId}, ${message}, ${data})`;
}
