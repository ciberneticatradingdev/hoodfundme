"use client";

import { useState } from "react";
import { OFFICIAL_CA } from "@/lib/chain";

export function CaPill({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(OFFICIAL_CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`inline-flex max-w-full items-center gap-2 rounded-full border border-up/40 bg-card ${compact ? "px-3 py-1.5" : "px-4 py-2.5"}`}>
      <span className="microlabel shrink-0 !text-updeep">$HOODFUNDME · CA</span>
      <button
        onClick={copy}
        title="Copy contract address"
        className={`mono min-w-0 truncate text-left text-ink transition hover:text-updeep ${compact ? "text-[10px]" : "text-xs"}`}
      >
        {OFFICIAL_CA}
      </button>
      <span className="mono shrink-0 text-xs text-updeep">{copied ? "✓" : "⧉"}</span>
      <a
        href={`https://www.ponsfamily.com/launchpad/${OFFICIAL_CA}`}
        target="_blank"
        rel="noreferrer"
        className="mono shrink-0 text-xs text-mut transition hover:text-updeep"
        title="Trade on pons"
      >
        ↗
      </a>
    </div>
  );
}
