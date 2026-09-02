"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchLaunches } from "@/lib/api";
import { TokenCard } from "@/components/token-card";
import { Reveal } from "@/components/motion";

export default function TokensPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["launches"],
    queryFn: fetchLaunches,
    refetchInterval: 15000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <Reveal>
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">Charity launchpad</p>
            <h1 className="display mt-3 text-4xl text-ink">Tokens</h1>
            <p className="mt-3 max-w-lg text-sm text-mut">
              Every coin launched here has its creator fees hard-wired to a cause.
              Trade them on pons — the fees do the giving.
            </p>
          </div>
          <Link href="/launch" className="btn-green shrink-0 px-5 py-2.5 text-sm">
            + Launch
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
        {(data ?? []).map((t, i) => (
          <Reveal key={t.launch_id} delay={(i % 3) as 0 | 1 | 2}>
            <TokenCard t={t} />
          </Reveal>
        ))}
      </div>
      {!isLoading && (data ?? []).length === 0 && (
        <div className="card-pop p-16 text-center text-mut">
          No tokens yet.{" "}
          <Link href="/launch" className="font-semibold text-updeep hover:underline">
            Launch the first coin for a cause.
          </Link>
        </div>
      )}
    </div>
  );
}
