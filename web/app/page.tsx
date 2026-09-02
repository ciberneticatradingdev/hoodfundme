"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchStats, fetchDonations, fetchEvents } from "@/lib/api";
import { fmtEth, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import { EXPLORER } from "@/lib/chain";
import { Reveal, CountUp } from "@/components/motion";

export default function Landing() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: fetchStats, refetchInterval: 10000 });
  const { data: donations } = useQuery({ queryKey: ["donations"], queryFn: fetchDonations, refetchInterval: 15000 });
  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents(), refetchInterval: 8000 });

  const ticker = (events ?? []).slice(0, 12);

  return (
    <div>
      {/* ------------------------------------------------ hero */}
      <section className="hero-glow relative overflow-hidden">
        {/* floating vault chips */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
          <div className="floaty absolute left-[8%] top-[30%] rounded-2xl border border-line bg-card px-4 py-3 shadow-sm" style={{ ["--r" as string]: "-4deg" }}>
            <div className="microlabel">vault 0x3f…a21c</div>
            <div className="mono mt-1 text-sm font-bold text-updeep">+0.42 ETH</div>
          </div>
          <div className="floaty absolute right-[7%] top-[24%] rounded-2xl border border-line bg-card px-4 py-3 shadow-sm" style={{ ["--r" as string]: "3deg", animationDelay: "1.2s" }}>
            <div className="microlabel">payout → cause</div>
            <div className="mono mt-1 text-sm font-bold text-updeep">100%</div>
          </div>
          <div className="floaty absolute bottom-[18%] right-[16%] rounded-2xl border border-line bg-card px-4 py-3 shadow-sm" style={{ ["--r" as string]: "-2deg", animationDelay: "2.1s" }}>
            <div className="microlabel">commission</div>
            <div className="mono mt-1 text-sm font-bold text-ink">0.00%</div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:pt-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="HoodFundMe" className="floaty rise mx-auto mb-6 h-24 w-24 object-contain sm:h-28 sm:w-28" />
          <p className="eyebrow rise rise-1">Robinhood Chain · trustless giving</p>
          <h1 className="display rise rise-2 mx-auto mt-5 max-w-4xl text-5xl text-ink sm:text-7xl">
            Fees in.
            <br />
            <span className="green-text">Giving out.</span>
          </h1>
          <p className="rise rise-3 mx-auto mt-6 max-w-xl text-base leading-relaxed text-mut sm:text-lg">
            The charity launchpad on Robinhood Chain. Launch a memecoin, link it
            to a cause, and its{" "}
            <span className="font-semibold text-ink">creator fees flow 100% to the campaign, automatically</span>.
            No cards. No middlemen. No trust required.
          </p>
          <div className="rise rise-4 mt-9 flex justify-center gap-3">
            <Link href="/launch" className="btn-green px-7 py-3.5 text-sm">
              Launch a coin
            </Link>
            <Link href="/tokens" className="btn-ghost px-7 py-3.5 text-sm">
              Explore tokens
            </Link>
          </div>
        </div>

        {/* live ticker */}
        {ticker.length > 0 && (
          <div className="full-bleed border-y border-line bg-card/70">
            <div className="marquee py-2.5">
              {[0, 1].map((k) => (
                <div key={k} aria-hidden={k === 1}>
                  {ticker.map((e) => (
                    <span key={`${k}-${e.id}`} className="mono mx-6 inline-flex items-center gap-2 text-xs text-mut">
                      <span className={`h-1.5 w-1.5 rounded-full ${e.type === "donated" ? "bg-up" : e.type === "campaign_created" ? "bg-gold" : "bg-line"}`} />
                      <span className="uppercase text-updeep">{e.type.replace(/_/g, " ")}</span>
                      {e.campaign_name && <span className="text-ink">{e.campaign_name}</span>}
                      <span>{e.message.length > 60 ? e.message.slice(0, 60) + "…" : e.message}</span>
                      <span className="text-line">·</span>
                      <span>{timeAgo(e.ts)}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ stats */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "ETH donated", value: stats?.totalRaisedEth ?? 0, fmt: (n: number) => fmtEth(n) },
            { label: "USD value", value: stats?.donatedUsd ?? 0, fmt: (n: number) => fmtUsd(n) },
            { label: "Pending in vaults", value: stats?.totalPendingEth ?? 0, fmt: (n: number) => `${fmtEth(n)} ETH` },
            { label: "Active campaigns", value: stats?.activeCampaigns ?? 0, fmt: (n: number) => String(Math.round(n)) },
          ].map((s, i) => (
            <Reveal key={s.label} delay={(i % 4) as 0 | 1 | 2 | 3}>
              <div className="card-pop p-6 text-center">
                <div className="display mono text-3xl text-updeep">
                  <CountUp value={s.value} format={s.fmt} />
                </div>
                <div className="microlabel mt-2">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ how it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="display mt-3 max-w-2xl text-3xl text-ink sm:text-5xl">
            Three steps.
            <br />
            Zero trust needed.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Launch a coin for a cause",
              body: "Name your coin, name your cause, set its wallet — all in one form. We generate and hold the launch key, so the launch is perfect by construction: fees can only go to the cause.",
            },
            {
              n: "02",
              title: "Trading does the giving",
              body: "Your coin trades on the pons bonding curve. Every creator fee it earns is swept by our keeper into the campaign's on-chain vault — hands-free.",
            },
            {
              n: "03",
              title: "Automatic payouts",
              body: "The HoodFund contract forwards the vault to the beneficiary. Anyone can trigger it, our keeper does. Every hop is a public transaction.",
            },
          ].map((c, i) => (
            <Reveal key={c.n} delay={(i + 1) as 1 | 2 | 3}>
              <div className="card-pop h-full p-8">
                <div className="display text-4xl text-line">{c.n}</div>
                <h3 className="display mt-4 text-xl text-ink">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mut">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ forest banner */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <Reveal>
          <div className="banner-forest relative overflow-hidden rounded-3xl px-8 py-16 sm:px-14">
            <div className="outline-type display pointer-events-none absolute -bottom-6 left-0 whitespace-nowrap text-[7rem] sm:text-[10rem]" aria-hidden>
              100% ON-CHAIN
            </div>
            <div className="relative grid gap-10 sm:grid-cols-3">
              {[
                {
                  title: "Trustless by design",
                  body: "We never hold funds. Vaults can only pay their beneficiary — enforced by the contract, not a promise.",
                },
                {
                  title: "0% commission, in code",
                  body: "There is no fee parameter in the contract. Read the source: 100% of every wei reaches the cause.",
                },
                {
                  title: "Verifiable forever",
                  body: "Every deposit and every payout is a public transaction on Robinhood Chain. Audit the whole history yourself.",
                },
              ].map((c) => (
                <div key={c.title}>
                  <h3 className="display text-lg text-up">{c.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-creamdark/75">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ recent payouts */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Transparency</p>
              <h2 className="display mt-3 text-3xl text-ink">Recent payouts</h2>
            </div>
            <Link href="/terminal" className="btn-ghost hidden px-5 py-2.5 text-xs sm:block">
              Live terminal →
            </Link>
          </div>
        </Reveal>
        <Reveal delay={1}>
          <div className="scrollbar-thin mt-8 overflow-x-auto rounded-3xl border border-line bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="microlabel p-4">Campaign</th>
                  <th className="microlabel p-4">Amount</th>
                  <th className="microlabel p-4">Beneficiary</th>
                  <th className="microlabel p-4">Tx</th>
                  <th className="microlabel p-4">When</th>
                </tr>
              </thead>
              <tbody className="mono">
                {(donations ?? []).slice(0, 8).map((d) => (
                  <tr key={d.id} className="border-b border-line/50 transition-colors last:border-0 hover:bg-card2/40">
                    <td className="p-4">
                      <Link href={`/campaign/${d.campaign_id}`} className="font-semibold text-updeep hover:underline">
                        {d.campaign_name ?? `#${d.campaign_id}`}
                      </Link>
                    </td>
                    <td className="tnum p-4 font-semibold text-ink">
                      {fmtEth(d.amount)} ETH
                      {d.amount_usd ? <span className="ml-1 text-mut">({fmtUsd(d.amount_usd)})</span> : null}
                    </td>
                    <td className="p-4 text-mut">{shortAddr(d.beneficiary)}</td>
                    <td className="p-4">
                      <a href={`${EXPLORER}/tx/${d.tx_hash}`} target="_blank" rel="noreferrer" className="text-mut transition hover:text-updeep">
                        {shortAddr(d.tx_hash)} ↗
                      </a>
                    </td>
                    <td className="p-4 text-mut">{timeAgo(d.ts)}</td>
                  </tr>
                ))}
                {(donations ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-mut">
                      No payouts yet —{" "}
                      <Link href="/create" className="font-semibold text-updeep hover:underline">
                        be the first cause
                      </Link>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
