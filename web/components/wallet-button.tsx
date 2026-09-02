"use client";

import { useAccount, useDisconnect } from "wagmi";
import { shortAddr } from "@/lib/format";
import { openWalletModal } from "./wallet-modal";

export function WalletButton() {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="mono ml-1 flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-xs font-medium text-updeep transition hover:border-up"
        title={`${connector?.name ?? "Wallet"} — click to disconnect`}
      >
        {connector?.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={connector.icon} alt="" className="h-4 w-4 rounded" />
        )}
        {shortAddr(address)}
      </button>
    );
  }
  return (
    <button onClick={openWalletModal} className="btn-green ml-1 px-4 py-2 text-xs">
      Connect
    </button>
  );
}
