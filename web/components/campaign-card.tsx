"use client";

import Link from "next/link";
import type { Campaign } from "@/lib/api";
import { fmtEth, shortAddr } from "@/lib/format";

export function CampaignCard({ c }: { c: Campaign }) {
  return (
    <Link href={`/campaign/${c.id}`} className="card-pop block p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display truncate text-xl text-ink">{c.name}</h3>
          <p className="mono mt-1.5 text-xs text-mut">vault {shortAddr(c.vault)}</p>
        </div>
        <span
          className={`microlabel shrink-0 rounded-full px-3 py-1 ${
            c.active ? "bg-updim !text-updeep" : "bg-card2"
          }`}
        >
          {c.active ? "active" : "paused"}
        </span>
      </div>
      {c.description && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-mut">{c.description}</p>
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
  );
}
