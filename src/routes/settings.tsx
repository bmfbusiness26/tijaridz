import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useI18n, LANGS, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات وبيانات الشركة | تِجَارِي" },
      { name: "description", content: "أدر بيانات شركتك، الرقم الضريبي، ولغة التطبيق في تِجَارِي." },
      { property: "og:title", content: "الإعدادات وبيانات الشركة | تِجَارِي" },
      { property: "og:description", content: "بيانات شركتك تظهر تلقائياً على فواتيرك." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", company_name: "", nif: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        company_name: profile.company_name ?? "",
        nif: profile.nif ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
      });
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form, lang }, { onConflict: "id" });
    setBusy(false);
    toast[error ? "error" : "success"](error ? t("common.error") : t("common.saved"));
  }

  const fields = [
    ["full_name", "auth.name"],
    ["company_name", "settings.companyName"],
    ["nif", "settings.nif"],
    ["phone", "settings.phone"],
    ["address", "settings.address"],
  ] as const;

  return (
    <AppShell title={t("nav.settings")}>
      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("settings.company")}</h2>
        {fields.map(([key, labelKey]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{t(labelKey)}</Label>
            <Input id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
        <Button className="w-full" disabled={busy} onClick={() => void save()}>
          {t("common.save")}
        </Button>
      </section>

      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("settings.lang")}</h2>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <Button
              key={l.code}
              variant={lang === l.code ? "default" : "outline"}
              onClick={() => setLang(l.code as Lang)}
            >
              {l.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="glass-card space-y-2 p-4">
        <h2 className="font-bold">{t("settings.account")}</h2>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
        >
          {t("auth.logout")}
        </Button>
      </section>
    </AppShell>
  );
}
