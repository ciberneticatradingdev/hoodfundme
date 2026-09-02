import { EXPLORER, FUND_ADDRESS } from "@/lib/chain";

export function Footer() {
  return (
    <footer className="border-t border-line py-8 text-center text-xs text-mut">
      <p>
        HoodFundMe — trustless giving on Robinhood Chain. 0% commission, enforced by code.
      </p>
      <p className="mt-2 mono">
        <a
          href={`${EXPLORER}/address/${FUND_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-up"
        >
          HoodFund contract ↗
        </a>
      </p>
    </footer>
  );
}
