import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type StatusTone = "idle" | "running" | "success" | "warning" | "danger";
type EnvironmentTone = "neutral" | "dev" | "staging" | "prod";

type NavItem = { label: string; href: string; exact?: boolean };
type Metric = { label: string; value: string; hint?: string };
type Action = { label: string; href: string; icon: LucideIcon; variant?: "ghost" | "secondary" | "primary" };

type AppHeaderProps = {
  description: string;
  navItems: NavItem[];
  metrics: Metric[];
  statusLabel: string;
  statusTone: StatusTone;
  environmentLabel: string;
  environmentTone: EnvironmentTone;
  actions: Action[];
};

export default function AppHeader({
  description, navItems, metrics, statusLabel, environmentLabel, actions,
}: AppHeaderProps) {
  return (
    <header className="surface-card space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">SkunkScrape · Skunky Platform</p>
          <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">Operations Console</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
          <p className="mt-2 text-xs text-slate-400" role="status">{environmentLabel} · {statusLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map(({ label, href, icon: Icon }) => (
            <Link key={href + label} href={href} className="btn-secondary btn-sm">
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </Link>
          ))}
        </div>
      </div>
      <nav className="flex flex-wrap gap-2 border-t border-white/10 pt-4" aria-label="Platform sections">
        {navItems.map(({ label, href }) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white">
            {label}
          </Link>
        ))}
      </nav>
      <dl className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 lg:grid-cols-4">
        {metrics.map(m => (
          <div key={m.label} className="min-w-0">
            <dt className="text-xs text-slate-400">{m.label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-white">{m.value}</dd>
            {m.hint && <p className="text-xs text-slate-400">{m.hint}</p>}
          </div>
        ))}
      </dl>
    </header>
  );
}
