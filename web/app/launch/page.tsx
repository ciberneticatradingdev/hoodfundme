"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { fetchLaunch, createLaunch } from "@/lib/api";
import { EXPLORER } from "@/lib/chain";
import { fmtEth, shortAddr } from "@/lib/format";
import { Reveal } from "@/components/motion";

const inputCls =
  "mt-2 w-full rounded-2xl border border-line bg-card px-5 py-3.5 text-sm outline-none transition focus:border-up";

export default function LaunchPage() {
  const { address } = useAccount();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("");
  const [causeName, setCauseName] = useState("");
  const [causeBeneficiary, setCauseBeneficiary] = useState("");
  const [causeUrl, setCauseUrl] = useState("");
  const [userWallet, setUserWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<{
    launchId: string;
    depositAddress: string;
    depositExpectedEth: number;
    timeoutMin: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const refundWallet = userWallet || address || "";
  const canSubmit =
    name.trim() && /^[A-Za-z0-9]{1,10}$/.test(symbol.trim()) &&
    causeName.trim() && isAddress(causeBeneficiary) &&
    isAddress(refundWallet) && !submitting;

  const { data: status } = useQuery({
    queryKey: ["launch", ticket?.launchId],
    queryFn: () => fetchLaunch(ticket!.launchId),
    enabled: !!ticket,
    refetchInterval: 4000,
  });

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const t = await createLaunch({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        logo: logo.trim(),
        description: description.trim(),
        causeName: causeName.trim(),
        causeBeneficiary: causeBeneficiary.trim(),
        causeUrl: causeUrl.trim(),
        userWallet: refundWallet,
      });
      setTicket(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyAddr = async () => {
    if (!ticket) return;
    await navigator.clipboard.writeText(ticket.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ---------------------------------------------------------- deposit view
  if (ticket) {
    const st = status?.status ?? "awaiting_deposit";
    return (
      <div className="hero-glow">
        <div className="mx-auto max-w-xl px-4 py-16">
          <Reveal>
            <p className="eyebrow">
              {st === "awaiting_deposit" && "Step 2 of 2 — fund the launch"}
              {st === "launching" && "Launching on pons…"}
              {st === "live" && "Live!"}
              {(st === "failed" || st === "expired" || st === "refunded") && "Launch failed"}
            </p>
            <h1 className="display mt-3 text-4xl text-ink">
              {status?.name ?? name} <span className="text-updeep">${status?.symbol ?? symbol.toUpperCase()}</span>
            </h1>
          </Reveal>

          {st === "awaiting_deposit" && (
            <Reveal delay={1}>
              <div className="card-pop mt-8 p-8">
                <p className="text-sm leading-relaxed text-mut">
                  Send exactly{" "}
                  <span className="mono font-bold text-ink">{ticket.depositExpectedEth} ETH</span>{" "}
                  on <span className="font-semibold text-ink">Robinhood Chain</span> to the launch
                  wallet below. We detect it and launch automatically — the pons launch fee and gas
                  come out of it, any leftover is donated to the cause, and a failed launch is
                  refunded to your wallet.
                </p>
                <button
                  onClick={copyAddr}
                  className="mono mt-5 block w-full break-all rounded-2xl border border-up/40 bg-updim px-5 py-4 text-left text-sm text-ink transition hover:border-up"
                >
                  {ticket.depositAddress} {copied ? "✓" : "⧉"}
                </button>
                <div className="mt-4 flex items-center gap-2">
                  <span className="live-dot h-2 w-2 rounded-full bg-up" />
                  <span className="microlabel">watching for your deposit · expires in {ticket.timeoutMin} min</span>
                </div>
              </div>
            </Reveal>
          )}

          {st === "launching" && (
            <div className="card-pop mt-8 p-8 text-center">
              <div className="skeleton mx-auto h-3 w-48 rounded-full" />
              <p className="mt-4 text-sm text-mut">Deposit received — launching your coin on the pons factory…</p>
            </div>
          )}

          {st === "live" && status && (
            <div className="card-pop mt-8 p-8">
              <p className="text-sm text-mut">
                <span className="font-semibold text-updeep">${status.symbol}</span> is live on Robinhood Chain.
                Every creator fee it earns now flows to{" "}
                <Link href={`/campaign/${status.campaign_id}`} className="font-semibold text-updeep hover:underline">
                  {status.campaign_name}
                </Link>{" "}
                automatically.
              </p>
              <div className="mono mt-5 space-y-2 text-xs">
                <p>token <a className="text-updeep hover:underline" href={`${EXPLORER}/address/${status.mint}`} target="_blank" rel="noreferrer">{status.mint} ↗</a></p>
                {status.launch_tx && (
                  <p>launch tx <a className="text-mut hover:text-updeep" href={`${EXPLORER}/tx/${status.launch_tx}`} target="_blank" rel="noreferrer">{shortAddr(status.launch_tx)} ↗</a></p>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <a href={`https://ponsfamily.com/token/${status.mint}`} target="_blank" rel="noreferrer" className="btn-green px-6 py-3 text-sm">
                  Trade on pons ↗
                </a>
                <Link href={`/campaign/${status.campaign_id}`} className="btn-ghost px-6 py-3 text-sm">
                  View campaign
                </Link>
              </div>
            </div>
          )}

          {(st === "failed" || st === "expired" || st === "refunded") && (
            <div className="card-pop mt-8 p-8">
              <p className="text-sm text-down">
                {st === "expired"
                  ? "The deposit window expired — nothing was received."
                  : `The launch failed${status?.error ? `: ${status.error}` : "."}`}
              </p>
              {status?.refund_tx && (
                <p className="mono mt-3 text-xs text-mut">
                  Deposit refunded:{" "}
                  <a className="text-updeep hover:underline" href={`${EXPLORER}/tx/${status.refund_tx}`} target="_blank" rel="noreferrer">
                    {shortAddr(status.refund_tx)} ↗
                  </a>
                </p>
              )}
              <button onClick={() => setTicket(null)} className="btn-pop mt-6 px-6 py-3 text-sm">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- form view
  return (
    <div className="hero-glow">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Reveal>
          <p className="eyebrow">Charity launchpad</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Launch a coin for a cause</h1>
          <p className="mt-4 text-sm leading-relaxed text-mut">
            We generate the launch wallet and hold the key — so the launch is perfect by
            construction: the coin&apos;s <span className="font-semibold text-ink">creator fees can
            only flow to the campaign</span>. You just fund it and shill it.
          </p>
        </Reveal>

        <Reveal delay={1}>
          <div className="card-pop mt-10 space-y-6 p-8">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="microlabel">Coin name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} className={inputCls} placeholder="Water Coin" />
              </div>
              <div>
                <label className="microlabel">Ticker</label>
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} maxLength={10} className={`mono ${inputCls}`} placeholder="WATER" />
              </div>
            </div>
            <div>
              <label className="microlabel">Logo URL (optional)</label>
              <input value={logo} onChange={(e) => setLogo(e.target.value)} className={`mono ${inputCls}`} placeholder="https://…" />
            </div>
            <div>
              <label className="microlabel">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className={inputCls} placeholder="Why this coin, why this cause" />
            </div>

            {/* ------------------------------------------------ the cause */}
            <div className="rounded-2xl border border-up/30 bg-updim/40 p-5">
              <p className="eyebrow">The cause — created with your launch</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="microlabel">Cause name</label>
                  <input value={causeName} onChange={(e) => setCauseName(e.target.value)} maxLength={80} className={inputCls} placeholder="Clean water for Valparaíso" />
                </div>
                <div>
                  <label className="microlabel">Beneficiary address</label>
                  <input value={causeBeneficiary} onChange={(e) => setCauseBeneficiary(e.target.value)} className={`mono ${inputCls}`} placeholder="0x…" />
                  {causeBeneficiary && !isAddress(causeBeneficiary) && (
                    <p className="mt-2 text-xs text-down">Not a valid address.</p>
                  )}
                  <p className="mt-2 text-xs text-mut">
                    The cause&apos;s wallet on Robinhood Chain — every creator fee is paid out here, on-chain.
                  </p>
                </div>
                <div>
                  <label className="microlabel">Cause link (optional)</label>
                  <input value={causeUrl} onChange={(e) => setCauseUrl(e.target.value)} className={`mono ${inputCls}`} placeholder="https://… (charity site, GoFundMe, …)" />
                  <p className="mt-2 text-xs text-mut">
                    Shown on the token so people can see where the money goes.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="microlabel">Your wallet (refunds)</label>
              <input
                value={userWallet}
                onChange={(e) => setUserWallet(e.target.value)}
                className={`mono ${inputCls}`}
                placeholder={address ?? "0x…"}
              />
              <p className="mt-2 text-xs text-mut">
                {address && !userWallet ? `Using your connected wallet ${shortAddr(address)}.` : "If the launch fails, the deposit is returned here."}
              </p>
            </div>

            <button onClick={submit} disabled={!canSubmit} className="btn-green w-full py-4 text-sm disabled:opacity-40">
              {submitting ? "Creating launch wallet…" : "Get launch address"}
            </button>
            {error && <p className="text-xs text-down">{error}</p>}
            <p className="text-center text-xs text-mut">
              Cost: pons launch fee (0.0005 ETH) + gas. No platform fee — 0% forever.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
