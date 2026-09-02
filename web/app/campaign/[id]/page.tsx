"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { fetchCampaign } from "@/lib/api";
import { fmtEth, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import { EXPLORER, FUND_ADDRESS } from "@/lib/chain";
import { fundAbi } from "@/lib/abi";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const cid = Number(id);
  const { data, refetch } = useQuery({
    queryKey: ["campaign", cid],
    queryFn: () => fetchCampaign(cid),
    refetchInterval: 10000,
  });
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("0.01");
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!data) return <div className="p-10 text-center text-mut">Loading…</div>;
  const { campaign: c, donations, deposits } = data;

  const donate = () => {
    writeContract({
      address: FUND_ADDRESS,
      abi: fundAbi,
      functionName: "donate",
      args: [BigInt(cid)],
      value: parseEther(amount || "0"),
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{c.name}</h1>
          {c.description && <p className="mt-2 max-w-xl text-mut">{c.description}</p>}
          {c.cause_url && (
            <a href={c.cause_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-up hover:underline">
              About this cause ↗
            </a>
          )}
        </div>
        <span className={`rounded px-2 py-1 text-xs uppercase ${c.active ? "bg-updim text-up" : "bg-card2 text-mut"}`}>
          {c.active ? "active" : "paused"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-card p-4 text-center">
          <div className="mono text-xl font-bold text-up">{fmtEth(Number(c.total_raised))} ETH</div>
          <div className="text-[10px] uppercase tracking-widest text-mut">donated</div>
        </div>
        <div className="rounded-lg border border-line bg-card p-4 text-center">
          <div className="mono text-xl font-bold">{fmtEth(Number(c.pending))} ETH</div>
          <div className="text-[10px] uppercase tracking-widest text-mut">pending in vault</div>
        </div>
        <div className="col-span-2 rounded-lg border border-line bg-card p-4 text-center sm:col-span-1">
          <div className="mono text-sm font-bold">{shortAddr(c.beneficiary)}</div>
          <div className="text-[10px] uppercase tracking-widest text-mut">beneficiary</div>
        </div>
      </div>

      {/* Vault address — the fee target */}
      <div className="mt-6 rounded-lg border border-up/40 bg-updim/30 p-5">
        <p className="text-xs uppercase tracking-widest text-up">Vault address — point your fees here</p>
        <p className="mono mt-2 break-all text-sm">{c.vault}</p>
        <p className="mt-2 text-xs text-mut">
          Any ETH sent to this address on Robinhood Chain is forwarded 100% to the
          beneficiary. Set it as your token&apos;s fee receiver, tip jar, or revenue split.
        </p>
      </div>

      {/* Direct donate */}
      <div className="mt-6 rounded-lg border border-line bg-card p-5">
        <p className="mb-3 font-bold">Donate directly</p>
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mono w-32 rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-up"
            placeholder="0.01"
          />
          <span className="self-center text-sm text-mut">ETH</span>
          <button
            onClick={donate}
            disabled={!isConnected || isPending}
            className="rounded-md bg-up px-5 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-40"
          >
            {isPending ? "Confirm in wallet…" : "Donate"}
          </button>
        </div>
        {!isConnected && <p className="mt-2 text-xs text-mut">Connect your wallet to donate.</p>}
        {isSuccess && txHash && (
          <p className="mono mt-2 text-xs text-up">
            Sent!{" "}
            <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">
              {shortAddr(txHash)} ↗
            </a>{" "}
            <button onClick={() => refetch()} className="text-mut underline">refresh</button>
          </p>
        )}
        {error && <p className="mt-2 text-xs text-down">{error.message.split("\n")[0]}</p>}
      </div>

      {/* Activity */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-bold">Payouts</h2>
          <div className="space-y-2">
            {donations.map((d) => (
              <div key={d.id} className="mono flex justify-between rounded-md border border-line bg-card p-3 text-xs">
                <span className="text-up">{fmtEth(d.amount)} ETH{d.amount_usd ? ` (${fmtUsd(d.amount_usd)})` : ""}</span>
                <a href={`${EXPLORER}/tx/${d.tx_hash}`} target="_blank" rel="noreferrer" className="text-mut hover:text-up">
                  {shortAddr(d.tx_hash)} ↗ · {timeAgo(d.ts)}
                </a>
              </div>
            ))}
            {donations.length === 0 && <p className="text-sm text-mut">No payouts yet.</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-bold">Vault deposits</h2>
          <div className="space-y-2">
            {deposits.map((d, i) => (
              <div key={i} className="mono flex justify-between rounded-md border border-line bg-card p-3 text-xs">
                <span>+{fmtEth(Number(d.amount))} ETH</span>
                <span className="text-mut">{timeAgo(d.detected_at)}</span>
              </div>
            ))}
            {deposits.length === 0 && <p className="text-sm text-mut">No deposits detected yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
