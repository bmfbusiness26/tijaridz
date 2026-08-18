import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية | تِجَارِي" },
      { name: "description", content: "كيف يحمي تِجَارِي بيانات عقودك وفواتيرك: تشفير كامل ولا مشاركة مع أطراف ثالثة." },
      { property: "og:title", content: "سياسة الخصوصية | تِجَارِي" },
      { property: "og:description", content: "بياناتك مشفّرة ولا تُشارك مع أي طرف ثالث." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useI18n();
  const sections = ["1", "2", "3", "4", "5"] as const;

  return (
    <AppShell requireAuth={false} title={t("privacy.title")}>
      <article className="glass-card space-y-4 p-5">
        <h1 className="text-xl font-extrabold text-gradient-gold">{t("privacy.title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("privacy.intro")}</p>
        {sections.map((n) => (
          <section key={n} className="space-y-1">
            <h2 className="font-bold">{t(`privacy.h${n}`)}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(`privacy.p${n}`)}</p>
          </section>
        ))}
      </article>
    </AppShell>
  );
}