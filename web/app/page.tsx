"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchStats, fetchDonations } from "@/lib/api";
import { fmtEth, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import { EXPLORER } from "@/lib/chain";

export default function Landing() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: fetchStats, refetchInterval: 10000 });
  const { data: donations } = useQuery({ queryKey: ["donations"], queryFn: fetchDonations, refetchInterval: 15000 });

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <p className="mono mb-4 text-xs uppercase tracking-widest text-up">
          ▲ Robinhood Chain · chain id 4663
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Fees in. <span className="text-up">Giving out.</span>
          <br />
          100% on-chain.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-mut">
          Every campaign gets its own vault address on Robinhood Chain. Point any fee
          stream at it — token creator fees, trading revenue, tips — and the smart
          contract forwards <span className="text-ink">100% to the cause, automatically</span>.
          No cards, no middlemen, no trust required.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/create"
            className="rounded-md bg-up px-6 py-3 font-semibold text-bg hover:opacity-90"
          >
            Create Campaign
          </Link>
          <Link
            href="/terminal"
            className="rounded-md border border-line px-6 py-3 font-semibold text-ink hover:border-up"
          >
            Live Terminal
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "ETH DONATED", value: fmtEth(stats?.totalRaisedEth ?? 0) },
          { label: "USD VALUE", value: fmtUsd(stats?.donatedUsd ?? 0) },
          { label: "PENDING IN VAULTS", value: `${fmtEth(stats?.totalPendingEth ?? 0)} ETH` },
          { label: "ACTIVE CAMPAIGNS", value: String(stats?.activeCampaigns ?? 0) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-card p-5 text-center">
            <div className="mono text-2xl font-bold text-up">{s.value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-mut">{s.label}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="py-20">
        <p className="mono text-center text-xs uppercase tracking-widest text-up">How it works</p>
        <h2 className="mt-2 text-center text-3xl font-bold">Three steps. Zero trust needed.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Create a campaign",
              body: "Name your cause and set the beneficiary address. The contract deploys a dedicated vault address for your campaign — on-chain, in one transaction.",
            },
            {
              step: "02",
              title: "Point fees at the vault",
              body: "Launch a token, run a bot, route trading fees — anything that earns ETH on Robinhood Chain. Set your vault as the fee receiver and forget about it.",
            },
            {
              step: "03",
              title: "Automatic payouts",
              body: "The contract forwards everything to the beneficiary. Anyone can trigger it, our keeper does it for you. Every payout is a public transaction.",
            },
          ].map((c) => (
            <div key={c.step} className="rounded-lg border border-line bg-card p-6">
              <div className="mono text-xs text-up">STEP {c.step}</div>
              <h3 className="mt-2 font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-mut">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Trustless by design",
              body: "We never hold funds. Vaults can only pay the beneficiary — it's enforced by the contract, not a promise.",
            },
            {
              title: "0% commission, in code",
              body: "There is no fee parameter in the contract. Read the source: 100% of every wei reaches the cause.",
            },
            {
              title: "Fully automated",
              body: "No human pays anyone. A keeper flushes vaults on a schedule, and anyone else can too if we ever stop.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-lg border border-line bg-card2 p-6">
              <h3 className="font-bold text-up">{c.title}</h3>
              <p className="mt-2 text-sm text-mut">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent payouts */}
      <section className="pb-20">
        <h2 className="mb-4 text-xl font-bold">Recent payouts</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-mut">
                <th className="p-3">Campaign</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Beneficiary</th>
                <th className="p-3">Tx</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody className="mono">
              {(donations ?? []).slice(0, 8).map((d) => (
                <tr key={d.id} className="border-b border-line/50">
                  <td className="p-3">
                    <Link href={`/campaign/${d.campaign_id}`} className="text-up hover:underline">
                      {d.campaign_name ?? `#${d.campaign_id}`}
                    </Link>
                  </td>
                  <td className="p-3">{fmtEth(d.amount)} ETH</td>
                  <td className="p-3 text-mut">{shortAddr(d.beneficiary)}</td>
                  <td className="p-3">
                    <a
                      href={`${EXPLORER}/tx/${d.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-mut hover:text-up"
                    >
                      {shortAddr(d.tx_hash)} ↗
                    </a>
                  </td>
                  <td className="p-3 text-mut">{timeAgo(d.ts)}</td>
                </tr>
              ))}
              {(donations ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-mut">
                    No payouts yet — be the first cause.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
