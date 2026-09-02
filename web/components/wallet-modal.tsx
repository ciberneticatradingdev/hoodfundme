"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnect, useSwitchChain, type Connector } from "wagmi";
import { robinhoodChain } from "@/lib/chain";

/// Multi-wallet connect modal. wagmi's EIP-6963 discovery lists every
/// installed EVM wallet (MetaMask, Phantom, Rabby, Coinbase, OKX, Backpack…)
/// with its own name + icon. Open it from anywhere:
///   window.dispatchEvent(new Event("hoodfund:connect"))

export function openWalletModal() {
  window.dispatchEvent(new Event("hoodfund:connect"));
}

const SUGGESTED = [
  { name: "MetaMask", match: "metamask", url: "https://metamask.io/download/", icon: "🦊" },
  { name: "Phantom", match: "phantom", url: "https://phantom.com/download", icon: "👻" },
  { name: "Rabby", match: "rabby", url: "https://rabby.io/", icon: "🐰" },
  { name: "Coinbase Wallet", match: "coinbase", url: "https://www.coinbase.com/wallet/downloads", icon: "🔵" },
  { name: "OKX Wallet", match: "okx", url: "https://web3.okx.com/download", icon: "⚫" },
];

export function WalletModal() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { connectors, connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();

  useEffect(() => {
    const onOpen = () => {
      setError("");
      setOpen(true);
    };
    window.addEventListener("hoodfund:connect", onOpen);
    return () => window.removeEventListener("hoodfund:connect", onOpen);
  }, []);

  // Discovered wallets (EIP-6963) each ship name + icon; hide the generic
  // "Injected" fallback whenever real wallets announced themselves.
  const wallets = useMemo(() => {
    const discovered = connectors.filter((c) => c.id !== "injected");
    return discovered.length > 0 ? discovered : connectors;
  }, [connectors]);

  const missing = SUGGESTED.filter(
    (s) => !wallets.some((w) => w.name.toLowerCase().includes(s.match))
  );

  const pick = async (connector: Connector) => {
    setBusy(connector.uid);
    setError("");
    try {
      await connectAsync({ connector });
      // force Robinhood Chain (adds it to the wallet if unknown)
      await switchChainAsync({ chainId: robinhoodChain.id }).catch(() => {});
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : "Connection failed";
      setError(msg.includes("rejected") ? "Request rejected in the wallet." : msg);
    } finally {
      setBusy(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-line bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="display text-lg text-ink">Connect a wallet</h2>
          <button onClick={() => setOpen(false)} className="text-mut transition hover:text-ink">
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {wallets.map((c) => (
            <button
              key={c.uid}
              onClick={() => pick(c)}
              disabled={busy !== null}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg px-4 py-3 text-left transition hover:border-up disabled:opacity-50"
            >
              {c.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon} alt="" className="h-8 w-8 rounded-lg" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card2 text-sm">🔌</span>
              )}
              <span className="flex-1 text-sm font-semibold text-ink">{c.name}</span>
              {busy === c.uid && <span className="microlabel">connecting…</span>}
            </button>
          ))}
          {wallets.length === 0 && (
            <p className="rounded-2xl bg-card2/60 px-4 py-3 text-xs text-mut">
              No EVM wallet detected in this browser.
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-down">{error}</p>}

        {missing.length > 0 && (
          <>
            <p className="microlabel mt-5">Don&apos;t have one?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missing.map((s) => (
                <a
                  key={s.match}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-mut transition hover:border-up hover:text-ink"
                >
                  {s.icon} {s.name}
                </a>
              ))}
            </div>
          </>
        )}

        <p className="mt-5 text-center text-[11px] text-mut">
          Connecting switches your wallet to Robinhood Chain automatically.
        </p>
      </div>
    </div>
  );
}
