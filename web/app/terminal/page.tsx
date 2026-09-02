"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/api";
import { timeAgo } from "@/lib/format";

const typeColor: Record<string, string> = {
  campaign_created: "text-gold",
  fee_received: "text-ink",
  donated: "text-up",
  beneficiary_updated: "text-mut",
  active_set: "text-mut",
  keeper_error: "text-down",
};

export default function TerminalPage() {
  const { data } = useQuery({
    queryKey: ["events"],
    queryFn: () => fetchEvents(),
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex items-center gap-2">
        <span className="live-dot h-2 w-2 rounded-full bg-up" />
        <h1 className="text-2xl font-bold">Live terminal</h1>
      </div>
      <p className="mb-6 text-sm text-mut">
        Every system event, public. Deposits, payouts, campaign changes — full transparency.
      </p>
      <div className="mono rounded-lg border border-line bg-card p-4 text-xs leading-6">
        {(data ?? []).map((e) => (
          <div key={e.id} className="flex gap-3 border-b border-line/40 py-1 last:border-0">
            <span className="w-10 shrink-0 text-mut">{timeAgo(e.ts)}</span>
            <span className={`w-36 shrink-0 uppercase ${typeColor[e.type] ?? "text-mut"}`}>
              {e.type}
            </span>
            <span className="min-w-0 flex-1 break-words">
              {e.campaign_id !== null && (
                <Link href={`/campaign/${e.campaign_id}`} className="text-up hover:underline">
                  [{e.campaign_name ?? `#${e.campaign_id}`}]
                </Link>
              )}{" "}
              {e.message}
            </span>
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <p className="py-6 text-center text-mut">No events yet — the chain is quiet.</p>
        )}
      </div>
    </div>
  );
}
