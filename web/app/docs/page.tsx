"use client";

import Link from "next/link";
import { EXPLORER, FUND_ADDRESS } from "@/lib/chain";
import { Reveal } from "@/components/motion";

const faqs = [
  {
    q: "Do you take a fee?",
    a: "No. There is no fee parameter in the HoodFund contract — read the source. You pay the pons launch fee (0.0005 ETH) and network gas; any unused gas budget is donated to your cause.",
  },
  {
    q: "Who holds the launch wallet?",
    a: "We generate a fresh wallet per coin and hold its key (encrypted at rest). That's what makes the launch perfect by construction: the coin's creatorFeeRecipient can only be that wallet, and that wallet only ever forwards to the campaign vault.",
  },
  {
    q: "What if my launch fails?",
    a: "Your deposit is refunded to your connected wallet automatically. A refund that fails is retried every minute until it lands — deposits are never abandoned.",
  },
  {
    q: "How do charities actually get paid?",
    a: "every.org causes: fees flow to the campaign vault, the contract pays them out, and donations are executed to the organization with receipts published in the terminal. GoFundMe causes: grokbot runs the deposit cycle every 6 hours.",
  },
  {
    q: "Can I verify any of this?",
    a: "All of it. Every vault deposit, payout, and launch is a public transaction on Robinhood Chain — the terminal streams them live, and every row links to the explorer.",
  },
  {
    q: "What happens when my coin graduates?",
    a: "pons moves it from the bonding curve to a Uniswap pool with locked liquidity. Creator fees keep flowing to your cause — the flywheel doesn't stop at graduation.",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Reveal>
        <p className="eyebrow">Docs</p>
        <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">How HoodFundMe works</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-mut">
          A charity launchpad on Robinhood Chain: launch a memecoin, link it to a
          cause, and 100% of its creator fees flow to that cause automatically —
          enforced by a smart contract, not a promise.
        </p>
      </Reveal>

      {/* the flywheel */}
      <Reveal delay={1}>
        <h2 className="display mt-14 text-2xl text-ink">The flywheel</h2>
        <div className="mono mt-5 space-y-0 rounded-3xl border border-line bg-card p-6 text-sm leading-8">
          <p><span className="text-updeep">01</span> you launch a coin on pons — one click, one wallet transaction</p>
          <p><span className="text-updeep">02</span> people trade it → the curve accrues creator fees</p>
          <p><span className="text-updeep">03</span> our keeper sweeps the fees into your campaign&apos;s on-chain vault</p>
          <p><span className="text-updeep">04</span> the HoodFund contract pays the vault out — 100%, no commission</p>
          <p><span className="text-updeep">05</span> the cause gets funded; every hop is a public transaction</p>
        </div>
      </Reveal>

      {/* launching */}
      <Reveal>
        <h2 className="display mt-14 text-2xl text-ink">Launching a coin</h2>
        <div className="mt-5 space-y-4 text-sm leading-relaxed text-mut">
          <p>
            Fill the form on <Link href="/launch" className="font-semibold text-updeep hover:underline">/launch</Link>:
            name, ticker, logo (drag &amp; drop), your cause, and an optional dev buy.
            One wallet transaction funds everything — the pons launch fee
            (0.0005 ETH), a gas budget priced at the current network rate, and
            your dev buy if you added one.
          </p>
          <p>
            We generate a dedicated launch wallet for your coin and hold its key.
            The coin is launched with that wallet as its{" "}
            <span className="mono text-ink">creatorFeeRecipient</span> — which is
            exactly why fees can&apos;t go anywhere but your cause. Dev-buy tokens are
            bought in the launch transaction itself and land straight in{" "}
            <span className="text-ink">your</span> wallet: nothing to front-run.
          </p>
          <p>
            Your coin&apos;s official website is its page here —{" "}
            <span className="mono text-ink">hoodfund.me/t/&lt;id&gt;</span> — stamped
            into its pons metadata. X link is optional and yours to choose.
          </p>
        </div>
      </Reveal>

      {/* causes */}
      <Reveal>
        <h2 className="display mt-14 text-2xl text-ink">The three cause rails</h2>
        <div className="mt-5 grid gap-4">
          <div className="card-pop p-6">
            <h3 className="font-bold text-ink">every.org — verified charities</h3>
            <p className="mt-2 text-sm leading-relaxed text-mut">
              Pick from 1M+ verified 501(c)(3) organizations. Fees flow on-chain to
              the campaign vault and are paid out to the org, receipts in the terminal.
            </p>
          </div>
          <div className="card-pop p-6">
            <h3 className="font-bold text-ink">GoFundMe — powered by grokbot 🤖</h3>
            <p className="mt-2 text-sm leading-relaxed text-mut">
              Paste any gofundme.com campaign link. Fees accumulate on-chain and
              grokbot deposits them to the GoFundMe every 6 hours, hands-free.
            </p>
          </div>
          <div className="card-pop p-6 opacity-60">
            <h3 className="font-bold text-ink">donate.gg <span className="microlabel ml-2 rounded-full bg-gold px-2 py-0.5 !text-forest">incoming</span></h3>
            <p className="mt-2 text-sm leading-relaxed text-mut">
              Verified giving rails, coming soon.
            </p>
          </div>
        </div>
      </Reveal>

      {/* the contract */}
      <Reveal>
        <h2 className="display mt-14 text-2xl text-ink">The contract</h2>
        <div className="banner-forest mt-5 rounded-3xl p-7">
          <p className="microlabel !text-up">HoodFund · Robinhood Chain (4663)</p>
          <a
            href={`${EXPLORER}/address/${FUND_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="mono mt-2 block break-all text-sm text-creamdark transition hover:text-up"
          >
            {FUND_ADDRESS} ↗
          </a>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-creamdark/75">
            <li>· Every campaign gets its own vault, deployed by the contract.</li>
            <li>· Vaults can only pay their campaign&apos;s beneficiary — enforced in code.</li>
            <li>· <span className="mono">flush()</span> is permissionless: anyone can trigger payouts, our keeper just does it first.</li>
            <li>· There is no fee parameter. 100% of every wei reaches the cause.</li>
          </ul>
          <a
            href="https://github.com/ciberneticatradingdev/hoodfundme"
            target="_blank"
            rel="noreferrer"
            className="mono mt-4 inline-block text-xs text-up hover:underline"
          >
            Read the source on GitHub ↗
          </a>
        </div>
      </Reveal>

      {/* faq */}
      <Reveal>
        <h2 className="display mt-14 text-2xl text-ink">FAQ</h2>
        <div className="mt-5 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="card-pop group p-5 open:border-up/50">
              <summary className="cursor-pointer list-none text-sm font-bold text-ink">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-mut">{f.a}</p>
            </details>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-14 text-center">
          <Link href="/launch" className="btn-green px-8 py-4 text-sm">
            Launch a coin for a cause 🚀
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
