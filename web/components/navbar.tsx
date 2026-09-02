"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet-button";

const links = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/terminal", label: "Terminal" },
  { href: "/create", label: "Create" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-up text-xl">▲</span>
          <span>
            Hood<span className="text-up">Fund</span>Me
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                path?.startsWith(l.href)
                  ? "bg-updim text-up"
                  : "text-mut hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}
