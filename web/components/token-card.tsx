"use client";

import Link from "next/link";
import type { Launch } from "@/lib/api";
import { fmtEth } from "@/lib/format";

export function TokenCard({ t, showCampaign = true }: { t: Launch; showCampaign?: boolean }) {
  const pct = Math.round((t.graduated ? 1 : t.curve_progress) * 100);
  return (
    <div className="card-pop p-6">
      <div className="flex items-center gap-3">
        <Link href={`/t/${t.launch_id}`} className="shrink-0">
          {t.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.logo} alt="" className="h-11 w-11 rounded-full border border-line object-cover" />
          ) : (
            <div className="display flex h-11 w-11 items-center justify-center rounded-full bg-forest text-sm text-up">
              {t.symbol.slice(0, 2)}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/t/${t.launch_id}`} className="flex items-baseline gap-2 hover:opacity-80">
            <span className="display truncate text-lg text-ink">{t.name}</span>
            <span className="mono text-xs font-bold text-updeep">${t.symbol}</span>
          </Link>
          {showCampaign && t.campaign_name && (
            <Link href={`/campaign/${t.campaign_id}`} className="text-xs text-mut hover:text-updeep">
              → {t.campaign_name}
            </Link>
          )}
        </div>
        <span className={`microlabel shrink-0 rounded-full px-2.5 py-1 ${t.graduated ? "bg-forest !text-up" : "bg-updim !text-updeep"}`}>
          {t.graduated ? "graduated" : "on curve"}
        </span>
      </div>

      {/* bonding curve progress */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-card2">
        <div className="h-full rounded-full bg-up transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mono mt-1.5 flex justify-between text-[10px] text-mut">
        <span>curve {pct}%</span>
        <span>{t.mint ? `${t.mint.slice(0, 8)}…` : ""}</span>
      </div>

      <div className="mono mt-4 flex justify-between border-t border-line pt-3 text-xs">
        <div>
          <div className="tnum font-bold text-updeep">{fmtEth(Number(t.fees_donated_eth))} ETH</div>
          <div className="microlabel mt-0.5">sent to cause</div>
        </div>
        <div className="text-right">
          <div className="tnum font-bold text-ink">{fmtEth(Number(t.pending_pot_eth))} ETH</div>
          <div className="microlabel mt-0.5">accruing</div>
        </div>
      </div>
    </div>
  );
}
