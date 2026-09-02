"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { fetchCampaign } from "@/lib/api";
import { fmtEth, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import { EXPLORER, FUND_ADDRESS } from "@/lib/chain";
import { fundAbi } from "@/lib/abi";
import Link from "next/link";
import { Reveal, CountUp } from "@/components/motion";
import { TokenCard } from "@/components/token-card";

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
  const [copied, setCopied] = useState(false);
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <div className="skeleton h-10 w-72 rounded-xl" />
        <div className="skeleton mt-6 h-40 rounded-3xl" />
      </div>
    );
  }
  const { campaign: c, donations, deposits, launches } = data;

  const donate = () => {
    writeContract({
      address: FUND_ADDRESS,
      abi: fundAbi,
      functionName: "donate",
      args: [BigInt(cid)],
      value: parseEther(amount || "0"),
    });
  };

  const copyVault = async () => {
    await navigator.clipboard.writeText(c.vault);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <Reveal>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Campaign #{c.id}</p>
            <h1 className="display mt-2 text-4xl text-ink sm:text-5xl">{c.name}</h1>
            {c.description && (
              <p className="mt-4 max-w-xl leading-relaxed text-mut">{c.description}</p>
            )}
            {c.cause_url && (
              <a
                href={c.cause_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-updeep hover:underline"
              >
                {c.kind === "gofundme" ? "View the GoFundMe ↗" : "About this cause ↗"}
              </a>
            )}
            {c.kind === "gofundme" && (
              <p className="mono mt-3 inline-block rounded-full bg-updim px-3 py-1.5 text-[11px] text-updeep">
                🤖 grokbot deposits to this GoFundMe every 6 hours
              </p>
            )}
            {c.kind === "org" && (
              <p className="mono mt-3 inline-block rounded-full bg-updim px-3 py-1.5 text-[11px] text-updeep">
                ✓ verified charity — direct on-chain transfer
              </p>
            )}
          </div>
          <span
            className={`microlabel shrink-0 rounded-full px-3 py-1.5 ${
              c.active ? "bg-updim !text-updeep" : "bg-card2"
            }`}
          >
            {c.active ? "active" : "paused"}
          </span>
        </div>
      </Reveal>

      <Reveal delay={1}>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="card-pop p-5 text-center">
            <div className="display mono text-2xl text-updeep">
              <CountUp value={Number(c.total_raised)} format={(n) => `${fmtEth(n)}`} /> ETH
            </div>
            <div className="microlabel mt-1.5">donated</div>
          </div>
          <div className="card-pop p-5 text-center">
            <div className="display mono text-2xl text-ink">
              <CountUp value={Number(c.pending)} format={(n) => `${fmtEth(n)}`} /> ETH
            </div>
            <div className="microlabel mt-1.5">pending in vault</div>
          </div>
          <div className="card-pop col-span-2 p-5 text-center sm:col-span-1">
            <div className="mono text-sm font-bold text-ink">{shortAddr(c.beneficiary)}</div>
            <div className="microlabel mt-1.5">beneficiary</div>
          </div>
        </div>
      </Reveal>

      {/* Vault — the fee target */}
      <Reveal delay={2}>
        <div className="banner-forest mt-8 overflow-hidden rounded-3xl p-8">
          <p className="eyebrow !text-up">Vault address — point your fees here</p>
          <button
            onClick={copyVault}
            className="mono mt-3 block w-full break-all text-left text-sm text-creamdark transition hover:text-up"
            title="Copy"
          >
            {c.vault} {copied ? "✓ copied" : "⧉"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-creamdark/60">
            Any ETH sent to this address on Robinhood Chain is forwarded 100% to the
            beneficiary. Set it as your token&apos;s fee receiver, tip jar, or revenue split.
          </p>
        </div>
      </Reveal>

      {/* Tokens supporting this cause */}
      <Reveal delay={2}>
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="display text-xl text-ink">Tokens backing this cause</h2>
            <Link href={`/launch`} className="btn-ghost px-4 py-2 text-xs">
              + Launch one
            </Link>
          </div>
          {(launches ?? []).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {launches.map((t) => (
                <TokenCard key={t.launch_id} t={t} showCampaign={false} />
              ))}
            </div>
          ) : (
            <p className="card-pop p-6 text-sm text-mut">
              No tokens yet — launch a coin and its creator fees fund this campaign hands-free.
            </p>
          )}
        </div>
      </Reveal>

      {/* Direct donate */}
      <Reveal delay={2}>
        <div className="card-pop mt-6 p-7">
          <p className="display text-lg text-ink">Donate directly</p>
          <div className="mt-4 flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mono w-36 rounded-full border border-line bg-bg px-5 py-3 text-sm outline-none transition focus:border-up"
              placeholder="0.01"
            />
            <span className="mono self-center text-sm text-mut">ETH</span>
            <button
              onClick={donate}
              disabled={!isConnected || isPending}
              className="btn-green px-7 py-3 text-sm disabled:opacity-40"
            >
              {isPending ? "Confirm in wallet…" : "Donate"}
            </button>
          </div>
          {!isConnected && (
            <p className="mt-3 text-xs text-mut">Connect your wallet to donate.</p>
          )}
          {isSuccess && txHash && (
            <p className="mono mt-3 text-xs text-updeep">
              Sent!{" "}
              <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">
                {shortAddr(txHash)} ↗
              </a>{" "}
              <button onClick={() => refetch()} className="text-mut underline">refresh</button>
            </p>
          )}
          {error && <p className="mt-3 text-xs text-down">{error.message.split("\n")[0]}</p>}
        </div>
      </Reveal>

      {/* Activity */}
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <Reveal>
          <h2 className="display mb-4 text-xl text-ink">Payouts</h2>
          <div className="space-y-2.5">
            {donations.map((d) => (
              <div key={d.id} className="mono flex items-center justify-between rounded-2xl border border-line bg-card p-4 text-xs">
                <span className="tnum font-bold text-updeep">
                  {fmtEth(d.amount)} ETH{d.amount_usd ? ` (${fmtUsd(d.amount_usd)})` : ""}
                </span>
                <a href={`${EXPLORER}/tx/${d.tx_hash}`} target="_blank" rel="noreferrer" className="text-mut transition hover:text-updeep">
                  {shortAddr(d.tx_hash)} ↗ · {timeAgo(d.ts)}
                </a>
              </div>
            ))}
            {donations.length === 0 && <p className="text-sm text-mut">No payouts yet.</p>}
          </div>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="display mb-4 text-xl text-ink">Vault deposits</h2>
          <div className="space-y-2.5">
            {deposits.map((d, i) => (
              <div key={i} className="mono flex items-center justify-between rounded-2xl border border-line bg-card p-4 text-xs">
                <span className="tnum font-bold text-ink">+{fmtEth(Number(d.amount))} ETH</span>
                <span className="text-mut">{timeAgo(d.detected_at)}</span>
              </div>
            ))}
            {deposits.length === 0 && <p className="text-sm text-mut">No deposits detected yet.</p>}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
