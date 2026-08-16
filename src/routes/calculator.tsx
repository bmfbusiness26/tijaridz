import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDzd, toNumber } from "@/lib/format";

function profitOf(results: unknown) {
  const value = (results as { profit?: number } | null)?.profit;
  return typeof value === "number" ? value : 0;
}

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "حاسبة ربح الاستيراد | تِجَارِي" },
      { name: "description", content: "احسب التكلفة الحقيقية لصفقة الاستيراد: الشراء، الشحن، الجمارك، وهامش الربح الصافي." },
      { property: "og:title", content: "حاسبة ربح الاستيراد | تِجَارِي" },
      { property: "og:description", content: "اعرف ربحك الحقيقي قبل أن تشتري البضاعة." },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ unitPrice: "", rate: "", qty: "", shipping: "", customs: "30", other: "", sell: "" });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const r = useMemo(() => {
    const qty = toNumber(f.qty);
    const goods = toNumber(f.unitPrice) * toNumber(f.rate) * qty;
    const customs = goods * (toNumber(f.customs) / 100);
    const totalCost = goods + customs + toNumber(f.shipping) + toNumber(f.other);
    const unitCost = qty > 0 ? totalCost / qty : 0;
    const revenue = toNumber(f.sell) * qty;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { totalCost, unitCost, revenue, profit, margin, breakeven: unitCost };
  }, [f]);

  const { data: history } = useQuery({
    queryKey: ["calculations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("calculations").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("calculations").insert({
      user_id: user.id,
      inputs: f,
      results: { totalCost: r.totalCost, unitCost: r.unitCost, revenue: r.revenue, profit: r.profit, margin: r.margin },
    });
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    void qc.invalidateQueries({ queryKey: ["calculations"] });
    void qc.invalidateQueries({ queryKey: ["overview"] });
  }

  const fields = [
    ["unitPrice", "calc.unitPrice"],
    ["rate", "calc.rate"],
    ["qty", "calc.qty"],
    ["shipping", "calc.shipping"],
    ["customs", "calc.customs"],
    ["other", "calc.other"],
    ["sell", "calc.sellPrice"],
  ] as const;

  return (
    <AppShell title={t("nav.calculator")}>
      <section className="glass-card grid gap-3 p-4 sm:grid-cols-2">
        {fields.map(([key, labelKey]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{t(labelKey)}</Label>
            <Input id={key} inputMode="decimal" value={f[key]} onChange={set(key)} />
          </div>
        ))}
      </section>

      <section className="glass-card space-y-2 p-4">
        {[
          ["calc.totalCost", r.totalCost],
          ["calc.unitCost", r.unitCost],
          ["calc.revenue", r.revenue],
          ["calc.breakeven", r.breakeven],
        ].map(([k, v]) => (
          <div key={k as string} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t(k as string)}</span>
            <span className="font-semibold">
              {formatDzd(v as number, lang)} {t("common.dzd")}
            </span>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
          <span className="text-sm text-muted-foreground">{t("calc.profit")}</span>
          <span className={`text-lg font-extrabold ${r.profit >= 0 ? "text-success" : "text-destructive"}`}>
            {formatDzd(r.profit, lang)} {t("common.dzd")} · {r.margin.toFixed(1)}%
          </span>
        </div>
        <Button className="w-full" onClick={() => void save()} disabled={r.totalCost <= 0}>
          {t("calc.save")}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 font-bold">{t("calc.history")}</h2>
        {(history ?? []).length === 0 ? (
          <p className="glass-card p-4 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : null}
        {(history ?? []).map((h) => (
          <div key={h.id} className="glass-card flex items-center justify-between p-3 text-sm">
            <span className="text-[11px] text-muted-foreground">{formatDate(h.created_at, lang)}</span>
            <span className={profitOf(h.results) >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
              {formatDzd(profitOf(h.results), lang)} {t("common.dzd")}
            </span>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
