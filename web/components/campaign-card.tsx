"use client";

import Link from "next/link";
import type { Campaign } from "@/lib/api";
import { fmtEth, shortAddr } from "@/lib/format";

export function CampaignCard({ c }: { c: Campaign }) {
  return (
    <Link
      href={`/campaign/${c.id}`}
      className="block rounded-lg border border-line bg-card p-5 transition-colors hover:border-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{c.name}</h3>
          <p className="mono mt-1 text-xs text-mut">vault {shortAddr(c.vault)}</p>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] uppercase ${
            c.active ? "bg-updim text-up" : "bg-card2 text-mut"
          }`}
        >
          {c.active ? "active" : "paused"}
        </span>
      </div>
      {c.description && (
        <p className="mt-3 line-clamp-2 text-sm text-mut">{c.description}</p>
      )}
      <div className="mono mt-4 flex justify-between text-sm">
        <span className="text-up">{fmtEth(Number(c.total_raised))} ETH donated</span>
        <span className="text-mut">{fmtEth(Number(c.pending))} ETH pending</span>
      </div>
    </Link>
  );
}
