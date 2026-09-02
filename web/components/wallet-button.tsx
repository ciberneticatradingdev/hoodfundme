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
        className="mono ml-2 rounded-md border border-line bg-card px-3 py-1.5 text-xs text-up hover:border-up"
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
      className="ml-2 rounded-md bg-up px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect"}
    </button>
  );
}
