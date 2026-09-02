"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import { FUND_ADDRESS, EXPLORER } from "@/lib/chain";
import { fundAbi } from "@/lib/abi";
import { shortAddr } from "@/lib/format";

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
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Create a campaign</h1>
      <p className="mt-2 text-sm text-mut">
        One transaction registers your campaign on-chain and deploys its dedicated
        vault address. 100% of anything the vault receives goes to the beneficiary.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="text-xs uppercase tracking-widest text-mut">Campaign name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2 outline-none focus:border-up"
            placeholder="Clean water for Valparaíso"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-mut">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-up"
            placeholder="What is this cause and where does the money go?"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-mut">Cause link (optional)</label>
          <input
            value={causeUrl}
            onChange={(e) => setCauseUrl(e.target.value)}
            className="mono mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-up"
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-mut">Beneficiary address</label>
          <input
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            className="mono mt-1 w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-up"
            placeholder="0x…"
          />
          {beneficiary && !validAddr && (
            <p className="mt-1 text-xs text-down">Not a valid address.</p>
          )}
          <p className="mt-1 text-xs text-mut">
            Where donations are paid. The cause&apos;s wallet on Robinhood Chain — you can
            update it later, but only you (the creator).
          </p>
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-md bg-up px-6 py-3 font-semibold text-bg hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Confirm in wallet…" : "Create campaign"}
        </button>
        {!isConnected && (
          <p className="text-center text-xs text-mut">Connect your wallet first.</p>
        )}
        {isSuccess && txHash && (
          <p className="mono text-center text-xs text-up">
            Campaign created!{" "}
            <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">
              {shortAddr(txHash)} ↗
            </a>{" "}
            — it will appear in Campaigns within seconds.
          </p>
        )}
        {error && <p className="text-xs text-down">{error.message.split("\n")[0]}</p>}
      </div>
    </div>
  );
}
