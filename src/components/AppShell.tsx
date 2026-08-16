import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  Calculator,
  FileText,
  Home,
  LogOut,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n, LANGS, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/contracts", labelKey: "nav.contracts", icon: FileText },
  { to: "/invoices", labelKey: "nav.invoices", icon: Receipt },
  { to: "/calculator", labelKey: "nav.calculator", icon: Calculator },
  { to: "/tools", labelKey: "nav.tools", icon: Wrench },
] as const;

export function AppShell({
  children,
  requireAuth = true,
  title,
}: {
  children: ReactNode;
  requireAuth?: boolean;
  title?: string;
}) {
  const { t, lang, setLang } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (requireAuth && !loading && !user) void navigate({ to: "/auth" });
  }, [requireAuth, loading, user, navigate]);

  if (requireAuth && (loading || !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t("common.loading")}</div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-28 pt-5">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
            <Sparkles className="size-5 text-primary-foreground" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold tracking-wide text-gradient-gold">{t("app.name")}</span>
            <span className="text-[11px] text-muted-foreground">{title ?? t("app.tagline")}</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code as Lang)}
              className={cn(
                "size-8 rounded-lg border text-[11px] font-bold transition-colors",
                lang === l.code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </button>
          ))}
          {user ? (
            <button
              type="button"
              aria-label={t("auth.logout")}
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: "/auth" });
              }}
              className="size-8 rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-destructive"
            >
              <LogOut className="mx-auto size-4" />
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 space-y-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-1.5">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SecondaryNav({ isAdmin }: { isAdmin?: boolean }) {
  const { t } = useI18n();
  const items = [
    { to: "/subscription", labelKey: "nav.subscription", icon: Sparkles },
    { to: "/settings", labelKey: "nav.settings", icon: Settings },
    ...(isAdmin ? [{ to: "/admin", labelKey: "nav.admin", icon: Shield }] : []),
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className="glass-card flex flex-col items-center gap-1.5 px-2 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <Icon className="size-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
