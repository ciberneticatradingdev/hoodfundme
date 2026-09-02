"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Reveal } from "@/components/motion";

const typeColor: Record<string, string> = {
  campaign_created: "text-gold",
  launch_created: "text-gold",
  token_launched: "text-gold",
  fee_received: "text-creamdark",
  fees_claimed: "text-creamdark",
  fees_forwarded: "text-up",
  donated: "text-up",
  beneficiary_updated: "text-creamdark/50",
  active_set: "text-creamdark/50",
  keeper_error: "text-down",
};

export default function TerminalPage() {
  const { data } = useQuery({
    queryKey: ["events"],
    queryFn: () => fetchEvents(),
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <Reveal>
        <div className="flex items-center gap-3">
          <span className="live-dot h-2.5 w-2.5 rounded-full bg-up" />
          <h1 className="display text-4xl text-ink">Live terminal</h1>
        </div>
        <p className="mt-3 text-sm text-mut">
          Every system event, public. Deposits, payouts, campaign changes — full transparency.
        </p>
      </Reveal>
      <Reveal delay={1}>
        <div className="banner-forest mono mt-8 overflow-hidden rounded-3xl p-6 text-xs leading-7">
          {(data ?? []).map((e) => (
            <div key={e.id} className="flex gap-4 border-b border-forestline/60 py-1.5 last:border-0">
              <span className="w-10 shrink-0 text-creamdark/40">{timeAgo(e.ts)}</span>
              <span className={`w-40 shrink-0 uppercase tracking-wide ${typeColor[e.type] ?? "text-creamdark/50"}`}>
                {e.type.replace(/_/g, " ")}
              </span>
              <span className="min-w-0 flex-1 break-words text-creamdark/85">
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
            <p className="py-10 text-center text-creamdark/40">No events yet — the chain is quiet.</p>
          )}
        </div>
      </Reveal>
    </div>
  );
}
