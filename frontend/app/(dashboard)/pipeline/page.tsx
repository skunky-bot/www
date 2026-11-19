"use client";

import * as React from "react";

type PreviewResponse = {
  mode: string;
  source: { id: string; url: string };
  result: {
    emails: string[];
    phones: string[];
    consent_status: string;
    outreach_allowed: boolean;
    persisted: boolean;
  };
  network_fetched: boolean;
  persisted: boolean;
};

export default function PipelinePage() {
  const [token, setToken] = React.useState("");
  const [html, setHtml] = React.useState('<a href="mailto:info@example.com">Contact</a>');
  const [query, setQuery] = React.useState("demo");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<PreviewResponse | null>(null);
  const [error, setError] = React.useState("");
  const configured = process.env.NEXT_PUBLIC_ENABLE_SKUNKY_PREVIEW === "true";
  const base = process.env.NEXT_PUBLIC_SKUNKY_API_BASE_URL || "";

  async function preview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!configured || !base) {
      setError("The preview API is not configured for this environment.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${base.replace(/\/$/, "")}/pipeline/preview`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          source_id: "example-docs",
          source_url: "https://example.com/",
          html,
          region: "ZA",
        }),
      });
      if (!response.ok) {
        throw new Error(`Preview failed (HTTP ${response.status}). Check your session and service configuration.`);
      }
      setResult((await response.json()) as PreviewResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-slate-900 p-6 text-slate-100">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Skunky Platform · Development preview</p>
        <h1 className="mt-2 text-2xl font-bold">Search → Scan → Collect</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Preview contact extraction from supplied demonstration HTML. Nothing is crawled,
          persisted, exported or used for outreach. This page is not a production scraper.
        </p>
      </div>
      {!configured ? (
        <p role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100">
          Disabled until NEXT_PUBLIC_ENABLE_SKUNKY_PREVIEW=true and a secured API endpoint are configured.
        </p>
      ) : (
        <form onSubmit={preview} className="space-y-4">
          <label className="block text-sm">
            Search term
            <input className="mt-1 w-full rounded-lg bg-slate-800 p-3" required maxLength={100}
              value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <label className="block text-sm">
            Short-lived API bearer token (held in memory only)
            <input className="mt-1 w-full rounded-lg bg-slate-800 p-3" required type="password"
              autoComplete="off" value={token} onChange={e => setToken(e.target.value)} />
          </label>
          <label className="block text-sm">
            Approved example HTML (200,000 characters maximum)
            <textarea className="mt-1 w-full rounded-lg bg-slate-800 p-3" required rows={6}
              maxLength={200000} value={html} onChange={e => setHtml(e.target.value)} />
          </label>
          <button disabled={busy} type="submit" className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">
            {busy ? "Validating..." : "Run preview"}
          </button>
        </form>
      )}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {result && (
        <div aria-live="polite" className="rounded-xl border border-white/10 bg-slate-950 p-5">
          <h2 className="text-lg font-semibold">Normalized result</h2>
          <p className="mt-2 text-sm text-slate-300">Emails: {result.result.emails.join(", ") || "none"}</p>
          <p className="text-sm text-slate-300">Phones: {result.result.phones.join(", ") || "none"}</p>
          <p className="mt-2 text-sm">Consent: {result.result.consent_status} · Outreach: blocked · Stored: no</p>
        </div>
      )}
    </section>
  );
}
