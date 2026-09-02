"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchLaunch } from "@/lib/api";
import { fmtEth, shortAddr, timeAgo } from "@/lib/format";
import { EXPLORER } from "@/lib/chain";
import { Reveal, CountUp } from "@/components/motion";

export default function TokenPage({ params }: { params: Promise<{ launchId: string }> }) {
  const { launchId } = use(params);
  const { data: t } = useQuery({
    queryKey: ["launch", launchId],
    queryFn: () => fetchLaunch(launchId),
    refetchInterval: 10000,
  });

  if (!t) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="skeleton mt-4 h-48 rounded-3xl" />
      </div>
    );
  }

  const pct = Math.round((t.graduated ? 1 : Number(t.curve_progress)) * 100);

  return (
    <div className="hero-glow">
      <div className="mx-auto max-w-3xl px-4 py-14">
        {/* header */}
        <Reveal>
          <div className="flex items-center gap-5">
            {t.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo} alt="" className="h-20 w-20 rounded-full border-2 border-line object-cover" />
            ) : (
              <div className="display flex h-20 w-20 items-center justify-center rounded-full bg-forest text-xl text-up">
                {t.symbol.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h1 className="display text-4xl text-ink">{t.name}</h1>
                <span className="mono text-lg font-bold text-updeep">${t.symbol}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={`microlabel rounded-full px-2.5 py-1 ${t.graduated ? "bg-forest !text-up" : "bg-updim !text-updeep"}`}>
                  {t.graduated ? "graduated" : t.status === "live" ? "on curve" : t.status}
                </span>
                {t.launched_at && <span className="microlabel">launched {timeAgo(t.launched_at)} ago</span>}
                {t.twitter && (
                  <a href={t.twitter} target="_blank" rel="noreferrer" className="mono text-xs text-mut transition hover:text-ink">
                    𝕏 ↗
                  </a>
                )}
              </div>
            </div>
          </div>
          {t.description && <p className="mt-5 max-w-xl leading-relaxed text-mut">{t.description}</p>}
        </Reveal>

        {/* cause banner */}
        <Reveal delay={1}>
          <Link
            href={`/campaign/${t.campaign_id}`}
            className="banner-forest mt-8 block overflow-hidden rounded-3xl p-6 transition hover:brightness-110"
          >
            <p className="eyebrow !text-up">
              {t.campaign_kind === "gofundme" ? "Backs a GoFundMe — grokbot 🤖 deposits every 6h" : "Backs a verified charity"}
            </p>
            <p className="display mt-2 text-2xl text-creamdark">{t.campaign_name}</p>
            <p className="mono mt-2 text-xs text-creamdark/60">
              100% of ${t.symbol} creator fees flow here automatically → view the campaign
            </p>
          </Link>
        </Reveal>

        {/* stats */}
        <Reveal delay={2}>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="card-pop p-5 text-center">
              <div className="display mono text-xl text-updeep">
                <CountUp value={Number(t.fees_donated_eth)} format={(n) => fmtEth(n)} /> ETH
              </div>
              <div className="microlabel mt-1.5">sent to cause</div>
            </div>
            <div className="card-pop p-5 text-center">
              <div className="display mono text-xl text-ink">
                <CountUp value={Number(t.pending_pot_eth)} format={(n) => fmtEth(n)} /> ETH
              </div>
              <div className="microlabel mt-1.5">accruing</div>
            </div>
            <div className="card-pop p-5 text-center">
              <div className="display mono text-xl text-ink">{pct}%</div>
              <div className="microlabel mt-1.5">curve progress</div>
            </div>
          </div>
        </Reveal>

        {/* curve bar */}
        <Reveal delay={2}>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-card2">
            <div className="h-full rounded-full bg-up transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </Reveal>

        {/* actions */}
        <Reveal delay={3}>
          <div className="mt-8 flex flex-wrap gap-3">
            {t.mint && (
              <a href={`https://www.ponsfamily.com/launchpad/${t.mint}`} target="_blank" rel="noreferrer" className="btn-green px-7 py-3.5 text-sm">
                Trade ${t.symbol} on pons ↗
              </a>
            )}
            <Link href={`/campaign/${t.campaign_id}`} className="btn-ghost px-7 py-3.5 text-sm">
              View campaign
            </Link>
          </div>
          {t.mint && (
            <div className="mono mt-6 space-y-1.5 text-xs text-mut">
              <p>
                token{" "}
                <a href={`${EXPLORER}/address/${t.mint}`} target="_blank" rel="noreferrer" className="text-updeep hover:underline">
                  {t.mint} ↗
                </a>
              </p>
              {t.launch_tx && (
                <p>
                  launch tx{" "}
                  <a href={`${EXPLORER}/tx/${t.launch_tx}`} target="_blank" rel="noreferrer" className="hover:text-updeep">
                    {shortAddr(t.launch_tx)} ↗
                  </a>
                </p>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </div>
  );
}
