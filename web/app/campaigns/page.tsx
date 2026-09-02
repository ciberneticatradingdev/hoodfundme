"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "@/lib/api";
import { CampaignCard } from "@/components/campaign-card";
import { Reveal } from "@/components/motion";

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
          </div>
          <Link href="/create" className="btn-green px-5 py-2.5 text-sm">
            + Create
          </Link>
        </div>
      </Reveal>
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-52 rounded-3xl" />
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((c, i) => (
          <Reveal key={c.id} delay={(i % 3) as 0 | 1 | 2}>
            <CampaignCard c={c} />
          </Reveal>
        ))}
      </div>
      {!isLoading && (data ?? []).length === 0 && (
        <div className="card-pop p-16 text-center text-mut">
          No campaigns yet.{" "}
          <Link href="/create" className="font-semibold text-updeep hover:underline">
            Create the first one.
          </Link>
        </div>
      )}
    </div>
  );
}
