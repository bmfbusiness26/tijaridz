import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  const [busy, setBusy] = useState(false);

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
  const total = amountNum * (1 + tvaNum / 100);

  async function create() {
    if (!user) return;
    setBusy(true);
    const number = `INV-${new Date().getFullYear()}-${String((invoices?.length ?? 0) + 1).padStart(4, "0")}`;
    const { error } = await supabase.from("invoices").insert({
      user_id: user.id,
      number,
      client_name: client.trim(),
      client_nif: clientNif.trim() || null,
      description: description.trim(),
      amount: amountNum,
      tva_rate: tvaNum,
      total,
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
      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("invoices.new")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-client">{t("invoices.client")}</Label>
            <Input id="i-client" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-nif">{t("invoices.clientNif")}</Label>
            <Input id="i-nif" value={clientNif} onChange={(e) => setClientNif(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-desc">{t("invoices.desc")}</Label>
          <Textarea id="i-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-amount">{t("invoices.amount")}</Label>
            <Input id="i-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-tva">{t("invoices.tva")}</Label>
            <Input id="i-tva" inputMode="decimal" value={tva} onChange={(e) => setTva(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
          <span className="text-sm text-muted-foreground">{t("invoices.total")}</span>
          <span className="text-lg font-extrabold text-primary">
            {formatDzd(total, lang)} {t("common.dzd")}
          </span>
        </div>
        <Button className="w-full" disabled={busy || client.trim().length < 2 || amountNum <= 0} onClick={() => void create()}>
          {t("invoices.create")}
        </Button>
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
                {formatDzd(Number(inv.total), lang)} {t("common.dzd")}
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
