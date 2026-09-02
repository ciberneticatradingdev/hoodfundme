"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "@/lib/api";
import { fmtEth } from "@/lib/format";
import { Reveal } from "@/components/motion";

const kindBadge: Record<string, { label: string; cls: string }> = {
  org: { label: "every.org · verified", cls: "bg-updim !text-updeep" },
  gofundme: { label: "GoFundMe · grokbot 🤖", cls: "bg-updim !text-updeep" },
  custom: { label: "custom cause", cls: "bg-card2" },
};

export default function CampaignsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
    refetchInterval: 15000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <Reveal>
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">Causes</p>
            <h1 className="display mt-3 text-4xl text-ink">Campaigns</h1>
            <p className="mt-3 max-w-lg text-sm text-mut">
              Every campaign is an on-chain vault. Tokens point their creator fees
              here — the contract pays the cause, automatically.
            </p>
          </div>
          <Link href="/launch" className="btn-green shrink-0 px-5 py-2.5 text-sm">
            + Launch a coin
          </Link>
        </div>
      </Reveal>
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-48 rounded-3xl" />
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((c, i) => {
          const badge = kindBadge[c.kind ?? "custom"] ?? kindBadge.custom;
          return (
            <Reveal key={c.id} delay={(i % 3) as 0 | 1 | 2}>
              <Link href={`/campaign/${c.id}`} className="card-pop block p-7">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="display min-w-0 truncate text-xl text-ink">{c.name}</h3>
                  <span className={`microlabel shrink-0 rounded-full px-2.5 py-1 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                {c.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-mut">{c.description}</p>
                )}
                <div className="mono mt-6 flex items-end justify-between border-t border-line pt-4 text-sm">
                  <div>
                    <div className="tnum font-bold text-updeep">{fmtEth(Number(c.total_raised))} ETH</div>
                    <div className="microlabel mt-0.5">donated</div>
                  </div>
                  <div className="text-right">
                    <div className="tnum font-bold text-ink">{fmtEth(Number(c.pending))} ETH</div>
                    <div className="microlabel mt-0.5">pending</div>
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
      {!isLoading && (data ?? []).length === 0 && (
        <div className="card-pop p-16 text-center text-mut">
          No campaigns yet — the first one is created with the first{" "}
          <Link href="/launch" className="font-semibold text-updeep hover:underline">
            coin launch
          </Link>
          .
        </div>
      )}
    </div>
  );
}
