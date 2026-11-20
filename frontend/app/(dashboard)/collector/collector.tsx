"use client";

import { Clock3, ListFilter, Pause, Play, Radar, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const apiBase = process.env.NEXT_PUBLIC_SKUNKY_API_BASE_URL?.trim().replace(/\/+$/, "");
const collectionPageSize = 8;
const contactPageSize = 30;
const inputStyle = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-400";
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

type Mode = "once" | "continuous";
type Status = "scheduled" | "running" | "paused" | "completed" | "failed";

type Collection = {
  id: string;
  query: string;
  mode: Mode;
  status: Status;
  interval_minutes: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_matched: number;
  last_scanned: number;
  run_count: number;
  result_count: number;
  last_error: string | null;
};

type Contact = {
  id: number;
  kind: "email" | "phone";
  value: string;
  source_url: string;
  last_seen: string;
};

type Page<T> = { items: T[]; has_more: boolean };
type CollectionPage = Page<Collection> & { enabled: boolean };
type Session = { access_token: string; user: { username: string } };

const statusStyle: Record<Status, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "pill-primary" },
  running: { label: "Scanning", className: "pill-primary" },
  paused: { label: "Paused", className: "pill-warning" },
  completed: { label: "Completed", className: "pill-success" },
  failed: { label: "Failed", className: "pill-danger" },
};

class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : body?.detail?.[0]?.msg;
    throw new RequestError(response.status, detail || `Request failed (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function message(error: unknown, fallback: string) {
  return error instanceof RequestError ? error.message : fallback;
}

function timeLabel(timestamp: string | null) {
  return timestamp ? dateFormatter.format(new Date(timestamp)) : "—";
}

function PageControls({ hasMore, offset, size, onMove }: {
  hasMore: boolean; offset: number; size: number; onMove: (offset: number) => void;
}) {
  if (!offset && !hasMore) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <button type="button" className="btn-secondary btn-sm min-h-10 disabled:opacity-40" disabled={!offset}
        onClick={() => onMove(offset - size)}>Previous</button>
      <span className="text-xs text-slate-300">Page {offset / size + 1}</span>
      <button type="button" className="btn-secondary btn-sm min-h-10 disabled:opacity-40" disabled={!hasMore}
        onClick={() => onMove(offset + size)}>Next</button>
    </div>
  );
}

function SignIn({ onSignIn }: { onSignIn: (session: Session) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const session = await request<Session>("/auth/login", {
        method: "POST",
        body: new URLSearchParams({ username: String(data.get("username")), password: String(data.get("password")) }),
      });
      onSignIn(session);
    } catch (error) {
      setError(message(error, "The collector API could not be reached."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={signIn} className="surface-card max-w-lg space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Sign in to SkunkScrape</h2>
        <p className="mt-1 text-sm text-slate-300">Use your operator account to manage collections.</p>
      </div>
      <label className="block text-sm font-medium">Username
        <input className={inputStyle} name="username" autoComplete="username" required />
      </label>
      <label className="block text-sm font-medium">Password
        <input className={inputStyle} name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn-primary min-h-11 disabled:opacity-50" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </form>
  );
}

function Workspace({ session, onSignOut }: { session: Session; onSignOut: (expired?: boolean) => void }) {
  const token = session.access_token;
  const [mode, setMode] = useState<Mode>("once");
  const [page, setPage] = useState<CollectionPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contactPage, setContactPage] = useState<{ collectionId: string; offset: number; data: Page<Contact> } | null>(null);
  const [contactOffset, setContactOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [listError, setListError] = useState("");
  const [contactsError, setContactsError] = useState("");
  const selected = page?.items.find(item => item.id === selectedId) ?? page?.items[0];
  const activeId = selected?.id;
  const lastRun = selected?.last_run_at;
  const contacts = contactPage && contactPage.collectionId === activeId && contactPage.offset === contactOffset
    ? contactPage.data : null;

  const handleError = useCallback((error: unknown, setError: (value: string) => void, fallback: string) => {
    if (error instanceof RequestError && error.status === 401) onSignOut(true);
    else setError(message(error, fallback));
  }, [onSignOut]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const data = await request<CollectionPage>(`/collections?offset=${offset}&limit=${collectionPageSize}`,
          { signal: controller.signal }, token);
        if (!controller.signal.aborted) {
          setPage(data);
          setListError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) handleError(error, setListError, "Could not load collections. Retrying…");
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
      }
    }
    void poll();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [offset, revision, token, handleError]);

  useEffect(() => {
    if (!activeId) return;
    const collectionId = activeId;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const data = await request<Page<Contact>>(
          `/collections/${collectionId}/contacts?offset=${contactOffset}&limit=${contactPageSize}`,
          { signal: controller.signal }, token,
        );
        if (!controller.signal.aborted) {
          setContactPage({ collectionId, offset: contactOffset, data });
          setContactsError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          handleError(error, setContactsError, "Could not load collected contacts. Retrying…");
          timer = setTimeout(load, 4000);
        }
      }
    }
    void load();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [activeId, contactOffset, lastRun, revision, token, handleError]);

  function selectCollection(id: string | null) {
    setSelectedId(id);
    setContactOffset(0);
    setContactPage(null);
    setContactsError("");
  }

  async function startCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setActionError("");
    try {
      const job = await request<Collection>("/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: String(form.get("query")).trim(),
          mode,
          region: String(form.get("region")).trim().toUpperCase(),
          source_limit: Number(form.get("source_limit")),
          interval_minutes: mode === "continuous" ? Number(form.get("interval")) : null,
        }),
      }, token);
      setPage(null);
      setOffset(0);
      selectCollection(job.id);
      setRevision(value => value + 1);
    } catch (error) {
      handleError(error, setActionError, "Could not start the collection.");
    } finally {
      setPending(false);
    }
  }

  async function toggleCollection(job: Collection) {
    setPending(true);
    setActionError("");
    try {
      const updated = await request<Collection>(`/collections/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: job.status !== "paused" }),
      }, token);
      setPage(current => current && { ...current, items: current.items.map(item => item.id === job.id ? updated : item) });
      setRevision(value => value + 1);
    } catch (error) {
      handleError(error, setActionError, "Could not update the collection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        <span className="break-all">Signed in as <strong className="text-white">{session.user.username}</strong></span>
        <button type="button" className="btn-secondary btn-sm min-h-10" onClick={() => onSignOut()}>Sign out</button>
      </div>
      {page?.enabled === false && <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">New collections are disabled in this environment.</p>}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <form onSubmit={startCollection} className="surface-card min-w-0 space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">New collection</h2>
          <label className="block text-sm font-medium" htmlFor="collector-query">Search keywords
            <span className="relative block">
              <Search size={17} className="pointer-events-none absolute left-3 top-[19px] text-cyan-300" aria-hidden="true" />
              <input id="collector-query" className={`${inputStyle} pl-10`} name="query" required maxLength={100}
                placeholder="e.g. solar Cape Town" aria-describedby="collector-query-hint" />
            </span>
          </label>
          <p id="collector-query-hint" className="-mt-3 text-xs text-slate-300">Keywords match the names and tags of approved sources.</p>
          <fieldset>
            <legend className="text-sm font-medium text-slate-100">Collection mode</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                { value: "once", title: "One-time scan", hint: "Scan matching sources once.", Icon: Search },
                { value: "continuous", title: "Continuous", hint: "Repeat in the background.", Icon: Clock3 },
              ] as const).map(({ value, title, hint, Icon }) => (
                <label key={value} className="relative block cursor-pointer">
                  <input type="radio" name="mode" value={value} className="peer sr-only" checked={mode === value}
                    onChange={() => setMode(value)} />
                  <span className="flex h-full items-start gap-3 rounded-xl border border-slate-600 p-3 peer-checked:border-cyan-300 peer-checked:bg-cyan-300/10 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300">
                    <Icon size={18} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden="true" />
                    <span><span className="block text-sm font-semibold text-white">{title}</span>
                      <span className="mt-1 block text-xs text-slate-300">{hint}</span></span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0 text-sm font-medium">Sources per scan
              <input type="number" name="source_limit" className={inputStyle} defaultValue={5} min={1} max={10} required />
            </label>
            <label className="block min-w-0 text-sm font-medium">Phone region
              <input name="region" className={`${inputStyle} uppercase`} defaultValue="ZA" maxLength={2}
                pattern="[A-Za-z]{2}" required title="Two-letter country code" />
            </label>
            {mode === "continuous" && <label className="block min-w-0 text-sm font-medium">Run every (minutes)
              <input type="number" name="interval" className={inputStyle} defaultValue={60} min={15} max={1440} required />
            </label>}
          </div>
          <button className="btn-primary min-h-11 disabled:opacity-50" type="submit" disabled={pending || !page?.enabled}>
            <Play size={16} aria-hidden="true" />
            {mode === "once" ? "Run scan" : "Start continuous collection"}
          </button>
        </form>
        <section className="surface-card min-w-0 p-5 sm:p-6" aria-labelledby="collections-heading">
          <h2 id="collections-heading" className="flex items-center gap-2 text-lg font-semibold text-white">
            <ListFilter size={19} className="shrink-0 text-cyan-300" aria-hidden="true" /> Collections
          </h2>
          {listError && <p role="alert" className="mt-3 text-sm text-red-300">{listError}</p>}
          {!page && !listError && <p role="status" className="mt-3 text-sm text-slate-300">Loading collections…</p>}
          {page?.items.length === 0 && <p className="mt-3 text-sm text-slate-300">Your scans and continuous collections will appear here.</p>}
          {page && <>
            <ul className="mt-4 grid gap-2">
              {page.items.map(job => (
                <li key={job.id} className="min-w-0">
                  <button type="button" onClick={() => { if (job.id !== activeId) selectCollection(job.id); }}
                    aria-pressed={job.id === activeId}
                    className="grid w-full min-w-0 gap-1 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-left hover:border-slate-400 aria-pressed:border-cyan-300/70 aria-pressed:bg-cyan-300/10">
                    <span className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <strong className="min-w-0 break-words text-sm text-white">{job.query}</strong>
                      <span className={statusStyle[job.status].className}>{statusStyle[job.status].label}</span>
                    </span>
                    <span className="text-xs text-slate-300">{job.mode === "once" ? "One-time scan" : `Every ${job.interval_minutes} min`} · {job.result_count} contacts</span>
                  </button>
                </li>
              ))}
            </ul>
            <PageControls hasMore={page.has_more} offset={offset} size={collectionPageSize} onMove={value => {
              setPage(null);
              setOffset(value);
              selectCollection(null);
            }} />
          </>}
        </section>
      </div>
      {actionError && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{actionError}</p>}
      {selected && (
        <section className="surface-card min-w-0 p-5 sm:p-6" aria-labelledby="contacts-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="contacts-heading" className="text-lg font-semibold text-white">Collected contacts</h2>
              <p className="mt-1 break-words text-sm text-cyan-200">{selected.query}</p>
            </div>
            {selected.mode === "continuous" && (
              <button type="button" className="btn-secondary btn-sm min-h-11 disabled:opacity-50"
                disabled={pending || (selected.status === "paused" && !page?.enabled)} onClick={() => void toggleCollection(selected)}>
                {selected.status === "paused" ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
                {selected.status === "paused" ? "Resume collection" : "Pause collection"}
              </button>
            )}
          </div>
          <dl className="mt-4 grid gap-3 border-y border-white/10 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
            <div><dt className="text-slate-300">Scan runs</dt><dd className="mt-1 font-semibold text-white">{selected.run_count}</dd></div>
            <div><dt className="text-slate-300">Sources scanned last run</dt><dd className="mt-1 font-semibold text-white">{selected.last_scanned} / {selected.last_matched}</dd></div>
            <div><dt className="text-slate-300">Last scan</dt><dd className="mt-1 font-semibold text-white">{timeLabel(selected.last_run_at)}</dd></div>
            <div><dt className="text-slate-300">Next scan</dt><dd className="mt-1 font-semibold text-white">{timeLabel(selected.next_run_at)}</dd></div>
          </dl>
          {selected.last_error && <p role="status" className="mt-4 whitespace-pre-line break-words rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">{selected.last_error}</p>}
          {contactsError && <p role="alert" className="mt-4 text-sm text-red-300">{contactsError}</p>}
          {!contacts && !contactsError && <p role="status" className="mt-4 text-sm text-slate-300">Loading contacts…</p>}
          {contacts?.items.length === 0 && <p className="mt-4 text-sm text-slate-300">
            {selected.run_count > 0 && selected.last_matched === 0 && !selected.last_error
              ? "No approved sources matched these keywords." : "No contacts collected yet."}
          </p>}
          {contacts && contacts.items.length > 0 && <div className="mt-4">
            <ul className="divide-y divide-white/10" aria-label="Contact results">
              {contacts.items.map(contact => (
                <li className="grid min-w-0 gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto] sm:items-start" key={contact.id}>
                  <div className="min-w-0"><p className="break-all font-semibold text-white">{contact.value}</p>
                    <p className="mt-1 text-xs text-slate-300">{contact.kind === "email" ? "Email" : "Phone"}</p></div>
                  <a className="min-w-0 break-all text-cyan-200 underline underline-offset-2 hover:text-white" href={contact.source_url}
                    target="_blank" rel="noreferrer">{contact.source_url}</a>
                  <span className="text-xs text-slate-300">Last seen {timeLabel(contact.last_seen)}</span>
                </li>
              ))}
            </ul>
            <PageControls hasMore={contacts.has_more} offset={contactOffset} size={contactPageSize}
              onMove={value => { setContactPage(null); setContactOffset(value); }} />
          </div>}
        </section>
      )}
    </div>
  );
}

export default function Collector() {
  const [session, setSession] = useState<Session | null>(null);
  const [expired, setExpired] = useState(false);
  const signOut = useCallback((timedOut = false) => {
    setSession(null);
    setExpired(timedOut);
  }, []);

  return (
    <section className="space-y-5" aria-labelledby="web-collector-heading">
      <header className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 p-5 sm:p-7">
        <div className="relative z-10 flex items-start gap-4">
          <span className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-2.5 text-cyan-200"><Radar size={24} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h1 id="web-collector-heading" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Web Collector</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-200">Find contacts from approved sources. Scan once or keep collecting on a schedule.</p>
          </div>
        </div>
      </header>
      {!apiBase && <p role="status" className="surface-card p-5 text-sm text-amber-100">The collector API is unavailable in this environment.</p>}
      {apiBase && !session && <>
        {expired && <p role="status" className="text-sm text-amber-100">Your session has expired. Sign in again to manage collections.</p>}
        <SignIn onSignIn={value => { setExpired(false); setSession(value); }} />
      </>}
      {session && <Workspace session={session} onSignOut={signOut} />}
    </section>
  );
}
