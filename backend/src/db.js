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
