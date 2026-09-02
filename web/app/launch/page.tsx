"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { openWalletModal } from "@/components/wallet-modal";
import {
  fetchLaunch,
  createLaunch,
  fetchCharities,
  fetchGofundmePreview,
  uploadLogo,
  type Charity,
} from "@/lib/api";
import { EXPLORER } from "@/lib/chain";
import { shortAddr } from "@/lib/format";
import { Reveal } from "@/components/motion";

const inputCls =
  "mt-2 w-full rounded-2xl border border-line bg-card px-5 py-3.5 text-sm outline-none transition focus:border-up";

/* ---------------------------------------------------------- logo dropzone */

function LogoDrop({
  logoUrl,
  onUploaded,
}: {
  logoUrl: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setErr("");
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      setErr("PNG, JPG, WEBP or GIF only.");
      return;
    }
    if (file.size > 1_400_000) {
      setErr("Max 1.4MB.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { url } = await uploadLogo(dataUrl);
      onUploaded(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="microlabel">Logo (required)</label>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`mt-2 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-5 transition ${
          drag ? "border-up bg-updim/50" : logoUrl ? "border-up/50 bg-card" : "border-line bg-card hover:border-up/60"
        }`}
      >
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="logo" className="h-16 w-16 rounded-full border border-line object-cover" />
        )}
        <div className="min-w-0 text-sm">
          {busy ? (
            <p className="text-mut">Uploading…</p>
          ) : logoUrl ? (
            <>
              <p className="font-semibold text-updeep">Logo uploaded ✓</p>
              <p className="mt-0.5 text-xs text-mut">Click or drop another image to replace it.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink">Drop your logo here, or click to browse</p>
              <p className="mt-0.5 text-xs text-mut">PNG · JPG · WEBP · GIF — max 1.4MB</p>
            </>
          )}
          {err && <p className="mt-1 text-xs text-down">{err}</p>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------- charity combobox */

function CharityPicker({
  charities,
  selected,
  onSelect,
}: {
  charities: Charity[];
  selected: Charity | null;
  onSelect: (c: Charity | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? charities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q)
        )
      : charities;
    return list.slice(0, 60);
  }, [charities, query]);

  return (
    <div ref={boxRef} className="relative">
      <label className="microlabel">Charity ({charities.length} available — type to search)</label>
      <input
        value={selected ? selected.name : query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSelect(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={inputCls}
        placeholder="Search by name, cause, keyword…"
      />
      {open && !selected && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-line bg-card shadow-xl">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={!c.wired}
              onClick={() => {
                onSelect(c);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 border-b border-line/40 px-4 py-2.5 text-left transition last:border-0 hover:bg-updim/40 disabled:opacity-40"
            >
              {c.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo} alt="" className="h-8 w-8 shrink-0 rounded-full border border-line object-cover" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-[10px] text-up">
                  {c.name.slice(0, 2)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                <span className="microlabel block truncate">{c.category}{c.wired ? "" : " · soon"}</span>
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-mut">No charities match &ldquo;{query}&rdquo;.</p>
          )}
        </div>
      )}

      {/* preview card */}
      {selected && (
        <div className="mt-3 flex gap-4 rounded-2xl border border-up/40 bg-card p-4">
          {selected.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.logo} alt="" className="h-14 w-14 shrink-0 rounded-full border border-line object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-forest text-sm text-up">
              {selected.name.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-bold text-ink">{selected.name}</span>
              <span className="microlabel">{selected.category}</span>
              {selected.location && <span className="microlabel">· {selected.location}</span>}
            </div>
            {selected.description && (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-mut">{selected.description}</p>
            )}
            <div className="mono mt-1.5 flex gap-3 text-xs">
              <a href={selected.website} target="_blank" rel="noreferrer" className="text-updeep hover:underline">
                {selected.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]} ↗
              </a>
              <button type="button" onClick={() => { onSelect(null); setQuery(""); }} className="text-mut hover:text-down">
                change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function LaunchPage() {
  const { address, isConnected } = useAccount();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [twitter, setTwitter] = useState("");
  const [mode, setMode] = useState<"org" | "gofundme">("org");
  const [charity, setCharity] = useState<Charity | null>(null);
  const [gofundmeUrl, setGofundmeUrl] = useState("");
  const [debouncedGf, setDebouncedGf] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<{
    launchId: string;
    depositAddress: string;
    depositExpectedEth: number;
    timeoutMin: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: charities } = useQuery({ queryKey: ["charities"], queryFn: fetchCharities });

  const validGofundme = /^https:\/\/(www\.)?gofundme\.com\/f\/[A-Za-z0-9-]+/.test(gofundmeUrl.trim());

  useEffect(() => {
    if (!validGofundme) {
      setDebouncedGf("");
      return;
    }
    const t = setTimeout(() => setDebouncedGf(gofundmeUrl.trim()), 600);
    return () => clearTimeout(t);
  }, [gofundmeUrl, validGofundme]);

  const { data: gfPreview, isFetching: gfLoading } = useQuery({
    queryKey: ["gf-preview", debouncedGf],
    queryFn: () => fetchGofundmePreview(debouncedGf),
    enabled: !!debouncedGf,
    staleTime: 3_600_000,
    retry: 1,
  });

  const causeOk = mode === "org" ? !!charity : validGofundme;
  const canSubmit =
    isConnected && !!address &&
    name.trim().length > 0 && /^[A-Za-z0-9]{1,10}$/.test(symbol.trim()) &&
    logoUrl && causeOk && !submitting;

  const { data: status } = useQuery({
    queryKey: ["launch", ticket?.launchId],
    queryFn: () => fetchLaunch(ticket!.launchId),
    enabled: !!ticket,
    refetchInterval: 4000,
  });

  const submit = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const t = await createLaunch({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        logo: logoUrl,
        description: description.trim(),
        twitter: twitter.trim(),
        ...(mode === "org" ? { charityId: charity!.id } : { gofundmeUrl: gofundmeUrl.trim() }),
        userWallet: address,
      });
      setTicket(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyAddr = async () => {
    if (!ticket) return;
    await navigator.clipboard.writeText(ticket.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ------------------------------------------------------- ticket views */
  if (ticket) {
    const st = status?.status ?? "awaiting_deposit";
    return (
      <div className="hero-glow">
        <div className="mx-auto max-w-xl px-4 py-16">
          <Reveal>
            <p className="eyebrow">
              {st === "awaiting_deposit" && "Step 2 of 2 — fund the launch"}
              {st === "launching" && "Launching on pons…"}
              {st === "live" && "Live!"}
              {(st === "failed" || st === "expired" || st === "refunded") && "Launch failed"}
            </p>
            <h1 className="display mt-3 text-4xl text-ink">
              {status?.name ?? name} <span className="text-updeep">${status?.symbol ?? symbol.toUpperCase()}</span>
            </h1>
          </Reveal>

          {st === "awaiting_deposit" && (
            <Reveal delay={1}>
              <div className="card-pop mt-8 p-8">
                <p className="text-sm leading-relaxed text-mut">
                  Send exactly{" "}
                  <span className="mono font-bold text-ink">{ticket.depositExpectedEth} ETH</span>{" "}
                  on <span className="font-semibold text-ink">Robinhood Chain</span> to the launch
                  wallet below. We detect it and launch automatically — the pons launch fee and gas
                  come out of it, and any leftover is donated to the cause.
                </p>
                <button
                  onClick={copyAddr}
                  className="mono mt-5 block w-full break-all rounded-2xl border border-up/40 bg-updim px-5 py-4 text-left text-sm text-ink transition hover:border-up"
                >
                  {ticket.depositAddress} {copied ? "✓" : "⧉"}
                </button>
                <div className="mt-4 flex items-center gap-2">
                  <span className="live-dot h-2 w-2 rounded-full bg-up" />
                  <span className="microlabel">watching for your deposit · expires in {ticket.timeoutMin} min</span>
                </div>
              </div>
            </Reveal>
          )}

          {st === "launching" && (
            <div className="card-pop mt-8 p-8 text-center">
              <div className="skeleton mx-auto h-3 w-48 rounded-full" />
              <p className="mt-4 text-sm text-mut">Deposit received — launching your coin on the pons factory…</p>
            </div>
          )}

          {st === "live" && status && (
            <div className="card-pop mt-8 p-8">
              <p className="text-sm text-mut">
                <span className="font-semibold text-updeep">${status.symbol}</span> is live on Robinhood Chain.
                Every creator fee it earns now flows to{" "}
                <Link href={`/campaign/${status.campaign_id}`} className="font-semibold text-updeep hover:underline">
                  {status.campaign_name}
                </Link>{" "}
                automatically.
              </p>
              <div className="mono mt-5 space-y-2 text-xs">
                <p>token <a className="text-updeep hover:underline" href={`${EXPLORER}/address/${status.mint}`} target="_blank" rel="noreferrer">{status.mint} ↗</a></p>
                {status.launch_tx && (
                  <p>launch tx <a className="text-mut hover:text-updeep" href={`${EXPLORER}/tx/${status.launch_tx}`} target="_blank" rel="noreferrer">{shortAddr(status.launch_tx)} ↗</a></p>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <a href={`https://ponsfamily.com/token/${status.mint}`} target="_blank" rel="noreferrer" className="btn-green px-6 py-3 text-sm">
                  Trade on pons ↗
                </a>
                <Link href={`/campaign/${status.campaign_id}`} className="btn-ghost px-6 py-3 text-sm">
                  View campaign
                </Link>
              </div>
            </div>
          )}

          {(st === "failed" || st === "expired" || st === "refunded") && (
            <div className="card-pop mt-8 p-8">
              <p className="text-sm text-down">
                {st === "expired"
                  ? "The deposit window expired — nothing was received."
                  : `The launch failed${status?.error ? `: ${status.error}` : "."}`}
              </p>
              {status?.refund_tx && (
                <p className="mono mt-3 text-xs text-mut">
                  Deposit refunded:{" "}
                  <a className="text-updeep hover:underline" href={`${EXPLORER}/tx/${status.refund_tx}`} target="_blank" rel="noreferrer">
                    {shortAddr(status.refund_tx)} ↗
                  </a>
                </p>
              )}
              <button onClick={() => setTicket(null)} className="btn-pop mt-6 px-6 py-3 text-sm">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------- form view */
  return (
    <div className="hero-glow">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Reveal>
          <p className="eyebrow">Charity launchpad</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Launch a coin for a cause</h1>
          <p className="mt-4 text-sm leading-relaxed text-mut">
            We generate the launch wallet and hold the key — so the launch is perfect by
            construction: the coin&apos;s <span className="font-semibold text-ink">creator fees can
            only flow to the campaign</span>. You just fund it and shill it.
          </p>
        </Reveal>

        <Reveal delay={1}>
          <div className="card-pop mt-10 space-y-6 p-8">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="microlabel">Coin name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} className={inputCls} placeholder="Water Coin" />
              </div>
              <div>
                <label className="microlabel">Ticker</label>
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} maxLength={10} className={`mono ${inputCls}`} placeholder="WATER" />
              </div>
            </div>

            <LogoDrop logoUrl={logoUrl} onUploaded={setLogoUrl} />

            <div>
              <label className="microlabel">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className={inputCls} placeholder="Why this coin, why this cause" />
            </div>

            <div>
              <label className="microlabel">X (optional)</label>
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className={`mono ${inputCls}`}
                placeholder="@handle or https://x.com/…"
              />
              <p className="mt-2 text-xs text-mut">
                The coin&apos;s website is set automatically to its page on HoodFundMe.
              </p>
            </div>

            {/* ------------------------------------------------ the cause */}
            <div className="rounded-2xl border border-up/30 bg-updim/40 p-5">
              <p className="eyebrow">The cause — created with your launch</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("org")}
                  className={`rounded-xl border p-3 text-left transition ${
                    mode === "org" ? "border-up bg-card" : "border-line bg-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="text-sm font-bold text-ink">every.org</div>
                  <div className="mt-1 text-[11px] leading-snug text-mut">1M+ verified charities — pick any org</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("gofundme")}
                  className={`rounded-xl border p-3 text-left transition ${
                    mode === "gofundme" ? "border-up bg-card" : "border-line bg-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="text-sm font-bold text-ink">GoFundMe</div>
                  <div className="mt-1 text-[11px] leading-snug text-mut">Deposits every 6h — by grokbot 🤖</div>
                </button>
                <div className="relative cursor-not-allowed rounded-xl border border-line bg-transparent p-3 text-left opacity-50">
                  <div className="text-sm font-bold text-ink">donate.gg</div>
                  <div className="mt-1 text-[11px] leading-snug text-mut">Verified giving rails</div>
                  <span className="microlabel absolute -top-2 right-2 rounded-full bg-gold px-2 py-0.5 !text-forest">incoming</span>
                </div>
              </div>

              {mode === "org" && (
                <div className="mt-4">
                  <CharityPicker charities={charities ?? []} selected={charity} onSelect={setCharity} />
                  <p className="mt-2 text-xs text-mut">
                    Verified 501(c)(3) orgs via every.org. Every creator fee is routed on-chain to the selected org.
                  </p>
                </div>
              )}

              {mode === "gofundme" && (
                <div className="mt-4">
                  <label className="microlabel">GoFundMe link</label>
                  <input
                    value={gofundmeUrl}
                    onChange={(e) => setGofundmeUrl(e.target.value)}
                    className={`mono ${inputCls}`}
                    placeholder="https://www.gofundme.com/f/…"
                  />
                  {gofundmeUrl && !validGofundme && (
                    <p className="mt-2 text-xs text-down">Must look like https://www.gofundme.com/f/&lt;slug&gt;</p>
                  )}

                  {gfLoading && <div className="skeleton mt-3 h-20 rounded-2xl" />}
                  {gfPreview && !gfLoading && (
                    <div className="mt-3 flex gap-4 rounded-2xl border border-up/40 bg-card p-4">
                      {gfPreview.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={gfPreview.image} alt="" className="h-16 w-24 shrink-0 rounded-xl border border-line object-cover" />
                      )}
                      <div className="min-w-0 text-sm">
                        <p className="line-clamp-1 font-bold text-ink">{gfPreview.title}</p>
                        {gfPreview.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mut">{gfPreview.description}</p>
                        )}
                        <p className="microlabel mt-1.5">gofundme.com/f/{gfPreview.slug}</p>
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-mut">
                    Creator fees accumulate on-chain and{" "}
                    <span className="font-semibold text-ink">grokbot 🤖 deposits them to the GoFundMe every 6 hours</span>{" "}
                    — hands-free, receipts in the terminal.
                  </p>
                </div>
              )}
            </div>

            {isConnected && address ? (
              <button onClick={submit} disabled={!canSubmit} className="btn-green w-full py-4 text-sm disabled:opacity-40">
                {submitting ? "Creating launch wallet…" : "Get launch address"}
              </button>
            ) : (
              <button onClick={openWalletModal} className="btn-green w-full py-4 text-sm">
                Connect wallet
              </button>
            )}
            {error && <p className="text-xs text-down">{error}</p>}
            <p className="text-center text-xs text-mut">
              Cost: pons launch fee (0.0005 ETH) + gas. No platform fee — 0% forever.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
