"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddr } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="mono ml-1 rounded-full border border-line bg-card px-4 py-2 text-xs font-medium text-updeep transition hover:border-up"
        title="Disconnect"
      >
        {shortAddr(address)}
      </button>
    );
  }
  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending || connectors.length === 0}
      className="btn-green ml-1 px-4 py-2 text-xs disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect"}
    </button>
  );
}
