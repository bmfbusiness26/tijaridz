import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Calculator, FileText, Receipt, Wrench } from "lucide-react";
import { AppShell, SecondaryNav } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getAccountOverview } from "@/lib/tijari.functions";
import { PLANS, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تِجَارِي | مساعد التاجر والمستورد الجزائري" },
      {
        name: "description",
        content: "حلّل عقود الاستيراد بالذكاء الاصطناعي، أنشئ فواتير إلكترونية واحسب هامش ربحك الحقيقي بالدينار الجزائري.",
      },
      { property: "og:title", content: "تِجَارِي | مساعد التاجر والمستورد الجزائري" },
      {
        property: "og:description",
        content: "عقود، فواتير، وحاسبة أرباح الاستيراد — في تطبيق واحد للتاجر الجزائري.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const overviewFn = useServerFn(getAccountOverview);

  const { data } = useQuery({
    queryKey: ["overview", user?.id],
    queryFn: () => overviewFn({ data: undefined }),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    void supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: (user.user_metadata?.["full_name"] as string) ?? null,
        phone: (user.user_metadata?.["phone"] as string) ?? null,
        lang,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }, [user, lang]);

  const sub = data?.subscription;
  const plan = PLANS[(sub?.plan as PlanId) ?? "free"] ?? PLANS.free;
  const limit = sub?.monthly_contract_limit ?? PLANS.free.monthlyContractLimit;
  const used = data?.counts.contractsThisMonth ?? 0;
  const remaining = limit < 0 ? "∞" : Math.max(0, limit - used);

  const cards = [
    { to: "/contracts", icon: FileText, title: t("home.analyzeTitle"), desc: t("home.analyzeDesc") },
    { to: "/invoices", icon: Receipt, title: t("home.invoiceTitle"), desc: t("home.invoiceDesc") },
    { to: "/calculator", icon: Calculator, title: t("home.calcTitle"), desc: t("home.calcDesc") },
    { to: "/tools", icon: Wrench, title: t("home.toolsTitle"), desc: t("home.toolsDesc") },
  ] as const;

  return (
    <AppShell>
      <section className="glass-card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{t("sub.current")}</p>
          <p className="text-lg font-extrabold text-primary">{t(plan.nameKey)}</p>
        </div>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">{t("home.quota")}</p>
          <p className="text-lg font-extrabold">{remaining}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { label: t("home.contracts"), value: data?.counts.contracts ?? 0 },
          { label: t("home.invoices"), value: data?.counts.invoices ?? 0 },
          { label: t("home.calculations"), value: data?.counts.calculations ?? 0 },
        ].map((s) => (
          <div key={s.label} className="glass-card px-3 py-4 text-center">
            <p className="text-2xl font-extrabold text-gradient-gold">{s.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="glass-card flex items-start gap-3 p-4 transition-colors hover:border-primary/40">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-bold">{c.title}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{c.desc}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <SecondaryNav isAdmin={data?.isAdmin ?? false} />
    </AppShell>
  );
}
