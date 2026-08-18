import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDzd, toNumber } from "@/lib/format";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "الفواتير الإلكترونية | تِجَارِي" },
      { name: "description", content: "أنشئ فواتير احترافية بالدينار الجزائري مع الرسم على القيمة المضافة وأرشفة سحابية." },
      { property: "og:title", content: "الفواتير الإلكترونية | تِجَارِي" },
      { property: "og:description", content: "فواتير جاهزة للطباعة والمشاركة، محفوظة في حسابك." },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [client, setClient] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [tva, setTva] = useState("19");
  const [currency, setCurrency] = useState("DZD");
  const [rate, setRate] = useState("1");
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const amountNum = toNumber(amount);
  const tvaNum = toNumber(tva);
  const rateNum = currency === "DZD" ? 1 : toNumber(rate) || 1;
  const tvaAmount = amountNum * (tvaNum / 100);
  const total = amountNum + tvaAmount;

  const missing = [
    !profile?.company_name && t("settings.companyName"),
    !profile?.company_address && t("settings.address"),
    !profile?.company_rc && "RC",
    !profile?.company_nif && "NIF",
    !profile?.company_cnas && "CNAS",
  ].filter(Boolean) as string[];

  const nextNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const seqs = (invoices ?? [])
      .map((i) => /^FA-(\d{4})-(\d+)$/.exec(i.number))
      .filter((m): m is RegExpExecArray => !!m && m[1] === String(year))
      .map((m) => Number(m[2]));
    const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
    return `FA-${year}-${String(next).padStart(4, "0")}`;
  }, [invoices]);

  const monthly = useMemo(() => {
    const map = new Map<string, { count: number; ht: number; tva: number }>();
    for (const inv of invoices ?? []) {
      const key = String(inv.invoice_date ?? inv.created_at).slice(0, 7);
      const r = Number(inv.exchange_rate ?? 1) || 1;
      const ht = Number(inv.amount) * r;
      const entry = map.get(key) ?? { count: 0, ht: 0, tva: 0 };
      entry.count += 1;
      entry.ht += ht;
      entry.tva += ht * (Number(inv.tva_rate) / 100);
      map.set(key, entry);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  }, [invoices]);

  async function create() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("invoices").insert({
      user_id: user.id,
      number: nextNumber,
      client_name: client.trim(),
      client_nif: clientNif.trim() || null,
      description: description.trim(),
      amount: amountNum,
      tva_rate: tvaNum,
      currency,
      exchange_rate: rateNum,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("limit") ? t("invoices.limit") : t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    setClient("");
    setClientNif("");
    setDescription("");
    setAmount("");
    void qc.invalidateQueries({ queryKey: ["invoices"] });
    void qc.invalidateQueries({ queryKey: ["overview"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  return (
    <AppShell title={t("nav.invoices")}>
      {missing.length ? (
        <section className="glass-card space-y-2 border-warning/40 p-4">
          <p className="text-sm font-semibold text-warning">{t("invoices.missing")}</p>
          <p className="text-xs text-muted-foreground">{missing.join(" · ")}</p>
          <Link to="/settings" className="inline-block text-xs font-bold text-primary underline">
            {t("invoices.completeProfile")}
          </Link>
        </section>
      ) : (
        <section className="glass-card space-y-1 p-4 text-xs text-muted-foreground">
          <p className="text-sm font-bold text-foreground">{profile?.company_name}</p>
          <p>{profile?.company_address}</p>
          <p dir="ltr" className="font-mono">
            RC {profile?.company_rc} · NIF {profile?.company_nif} · CNAS {profile?.company_cnas}
          </p>
        </section>
      )}

      <section className="glass-card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t("invoices.new")}</h2>
          <span className="rounded-lg bg-primary/10 px-2 py-1 font-mono text-xs text-primary">{nextNumber}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-client">{t("invoices.client")}</Label>
            <Input id="i-client" className="h-12 text-base" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-nif">{t("invoices.clientNif")}</Label>
            <Input id="i-nif" className="h-12 text-base" inputMode="numeric" value={clientNif} onChange={(e) => setClientNif(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-desc">{t("invoices.desc")}</Label>
          <Textarea id="i-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-amount">{`${t("invoices.ht")} (${currency})`}</Label>
            <Input id="i-amount" className="h-12 text-base" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-tva">{t("invoices.tvaType")}</Label>
            <select
              id="i-tva"
              value={tva}
              onChange={(e) => setTva(e.target.value)}
              className="h-12 w-full rounded-md border border-input bg-surface px-3 text-base"
            >
              <option value="19">{t("invoices.tva19")}</option>
              <option value="9">{t("invoices.tva9")}</option>
              <option value="0">{t("invoices.tva0")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-cur">{t("invoices.currency")}</Label>
            <select
              id="i-cur"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setRate(e.target.value === "DZD" ? "1" : e.target.value === "EUR" ? "245" : e.target.value === "USD" ? "228" : "32");
              }}
              className="h-12 w-full rounded-md border border-input bg-surface px-3 text-base"
            >
              {["DZD", "EUR", "USD", "CNY"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {currency !== "DZD" ? (
            <div className="space-y-1.5">
              <Label htmlFor="i-rate">{t("invoices.rate")}</Label>
              <Input id="i-rate" className="h-12 text-base" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          ) : null}
        </div>
        <div className="space-y-1 rounded-xl bg-primary/10 px-4 py-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("invoices.ht")}</span>
            <span>
              {formatDzd(amountNum, lang)} {currency}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>
              {t("invoices.tvaAmount")} {tvaNum}%
            </span>
            <span>
              {formatDzd(tvaAmount, lang)} {currency}
            </span>
          </div>
          <div className="flex justify-between font-extrabold text-primary">
            <span>{t("invoices.total")}</span>
            <span>
              {formatDzd(total, lang)} {currency}
            </span>
          </div>
          {currency !== "DZD" ? (
            <p className="text-end text-[11px] text-muted-foreground">
              ≈ {formatDzd(total * rateNum, lang)} {t("common.dzd")}
            </p>
          ) : null}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" /> {t("common.privacyNote")}
        </p>
        <Button className="h-12 w-full" disabled={busy || client.trim().length < 2 || amountNum <= 0} onClick={() => void create()}>
          {t("invoices.create")}
        </Button>
      </section>

      <section className="glass-card space-y-2 p-4">
        <h2 className="font-bold">{t("invoices.monthly")}</h2>
        {monthly.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{t("invoices.month")}</span>
              <span className="flex gap-4">
                <span>{t("invoices.count")}</span>
                <span>{t("invoices.ht")}</span>
                <span>TVA</span>
              </span>
            </div>
            {monthly.map(([month, v]) => (
              <div key={month} className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-0">
                <span className="font-semibold" dir="ltr">
                  {month}
                </span>
                <span className="flex gap-4 tabular-nums text-muted-foreground">
                  <span>{v.count}</span>
                  <span>{formatDzd(v.ht, lang)}</span>
                  <span className="font-semibold text-primary">{formatDzd(v.tva, lang)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="px-1 font-bold">{t("invoices.archive")}</h2>
        {(invoices ?? []).length === 0 ? (
          <p className="glass-card p-4 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : null}
        {(invoices ?? []).map((inv) => (
          <article key={inv.id} className="glass-card space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{inv.client_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {inv.number} · {formatDate(inv.created_at, lang)}
                </p>
              </div>
              <p className="font-extrabold text-primary">
                {formatDzd(Number(inv.amount) * (1 + Number(inv.tva_rate) / 100), lang)} {inv.currency}
              </p>
            </div>
            {inv.description ? <p className="text-xs text-muted-foreground">{inv.description}</p> : null}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                {t("common.print")}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(inv.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
