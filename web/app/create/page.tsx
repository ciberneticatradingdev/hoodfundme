"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import { FUND_ADDRESS, EXPLORER } from "@/lib/chain";
import { fundAbi } from "@/lib/abi";
import { shortAddr } from "@/lib/format";
import { Reveal } from "@/components/motion";

const inputCls =
  "mt-2 w-full rounded-2xl border border-line bg-card px-5 py-3.5 text-sm outline-none transition focus:border-up";

export default function CreatePage() {
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [causeUrl, setCauseUrl] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const validAddr = isAddress(beneficiary);
  const canSubmit = isConnected && name.trim().length > 0 && validAddr && !isPending;

  const submit = () => {
    // Metadata travels on-chain as a data: URI — no server dependency.
    const metadata = {
      description: description.trim(),
      causeUrl: causeUrl.trim(),
    };
    const uri = `data:application/json;base64,${btoa(
      unescape(encodeURIComponent(JSON.stringify(metadata)))
    )}`;
    writeContract({
      address: FUND_ADDRESS,
      abi: fundAbi,
      functionName: "createCampaign",
      args: [name.trim(), uri, beneficiary as `0x${string}`],
    });
  };

  return (
    <div className="hero-glow">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Reveal>
          <p className="eyebrow">One transaction</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Create a campaign</h1>
          <p className="mt-4 text-sm leading-relaxed text-mut">
            Registers your campaign on-chain and deploys its dedicated vault address.
            100% of anything the vault receives goes to the beneficiary — forever.
          </p>
        </Reveal>

        <Reveal delay={1}>
          <div className="card-pop mt-10 space-y-6 p-8">
            <div>
              <label className="microlabel">Campaign name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className={inputCls}
                placeholder="Clean water for Valparaíso"
              />
            </div>
            <div>
              <label className="microlabel">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className={inputCls}
                placeholder="What is this cause and where does the money go?"
              />
            </div>
            <div>
              <label className="microlabel">Cause link (optional)</label>
              <input
                value={causeUrl}
                onChange={(e) => setCauseUrl(e.target.value)}
                className={`mono ${inputCls}`}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="microlabel">Beneficiary address</label>
              <input
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                className={`mono ${inputCls}`}
                placeholder="0x…"
              />
              {beneficiary && !validAddr && (
                <p className="mt-2 text-xs text-down">Not a valid address.</p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-mut">
                Where donations are paid — the cause&apos;s wallet on Robinhood Chain.
                Only you (the creator) can update it later.
              </p>
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="btn-green w-full py-4 text-sm disabled:opacity-40"
            >
              {isPending ? "Confirm in wallet…" : "Create campaign"}
            </button>
            {!isConnected && (
              <p className="text-center text-xs text-mut">Connect your wallet first.</p>
            )}
            {isSuccess && txHash && (
              <p className="mono text-center text-xs text-updeep">
                Campaign created!{" "}
                <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">
                  {shortAddr(txHash)} ↗
                </a>{" "}
                — it will appear in Campaigns within seconds.
              </p>
            )}
            {error && <p className="text-xs text-down">{error.message.split("\n")[0]}</p>}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
