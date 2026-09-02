"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet-button";

const links = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/tokens", label: "Tokens" },
  { href: "/terminal", label: "Terminal" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="display flex items-center gap-2 text-lg text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-sm text-up">
            ▲
          </span>
          <span>
            Hood<span className="text-updeep">Fund</span>Me
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                path?.startsWith(l.href)
                  ? "bg-updim text-updeep"
                  : "text-mut hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/launch"
            className="btn-pop hidden px-4 py-2 text-sm sm:block"
          >
            Launch a coin
          </Link>
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}
