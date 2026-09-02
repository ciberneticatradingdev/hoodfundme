"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "@/lib/api";
import { CampaignCard } from "@/components/campaign-card";

export default function CampaignsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
    refetchInterval: 15000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link
          href="/create"
          className="rounded-md bg-up px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
        >
          + Create
        </Link>
      </div>
      {isLoading && <p className="text-mut">Loading…</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((c) => (
          <CampaignCard key={c.id} c={c} />
        ))}
      </div>
      {!isLoading && (data ?? []).length === 0 && (
        <p className="rounded-lg border border-line bg-card p-10 text-center text-mut">
          No campaigns yet. <Link href="/create" className="text-up hover:underline">Create the first one.</Link>
        </p>
      )}
    </div>
  );
}
