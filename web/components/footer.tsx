import { EXPLORER, FUND_ADDRESS } from "@/lib/chain";
import { CaPill } from "./ca-pill";

export function Footer() {
  return (
    <footer className="hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="display flex items-center gap-2.5 text-lg text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            HoodFundMe
          </div>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-mut">
            Trustless giving on Robinhood Chain. Every campaign is a vault, every
            payout is a public transaction, and the 0% commission is enforced by
            code — not a promise.
          </p>
          <div className="mt-4">
            <CaPill compact />
          </div>
        </div>
        <div className="flex gap-14">
          <div>
            <div className="microlabel mb-3">App</div>
            <ul className="space-y-2 text-xs font-medium text-mut">
              <li><a href="/tokens" className="transition hover:text-ink">Tokens</a></li>
              <li><a href="/campaigns" className="transition hover:text-ink">Campaigns</a></li>
              <li><a href="/launch" className="transition hover:text-ink">Launch a coin</a></li>
              <li><a href="/terminal" className="transition hover:text-ink">Live terminal</a></li>
              <li><a href="/docs" className="transition hover:text-ink">Docs</a></li>
            </ul>
          </div>
          <div>
            <div className="microlabel mb-3">Protocol</div>
            <ul className="space-y-2 text-xs font-medium text-mut">
              <li>
                <a
                  href={`${EXPLORER}/address/${FUND_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-ink"
                >
                  HoodFund contract ↗
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ciberneticatradingdev/hoodfundme"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-ink"
                >
                  Source code ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
