import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDzd, toNumber } from "@/lib/format";

const CURRENCIES = ["USD", "EUR", "CNY"] as const;
const DEFAULT_RATES: Record<string, string> = { USD: "228", EUR: "245", CNY: "32" };

const DEMO = {
  currency: "CNY",
  unitPrice: "12.5",
  rate: "32",
  qty: "500",
  shipping: "1800",
  customs: "30",
  other: "25000",
  sell: "1200",
};

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
  const [f, setF] = useState({
    currency: "EUR",
    unitPrice: "",
    rate: DEFAULT_RATES["EUR"]!,
    qty: "",
    shipping: "",
    customs: "30",
    other: "",
    sell: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const r = useMemo(() => {
    const qty = toNumber(f.qty);
    const rate = toNumber(f.rate) || 1;
    const goodsFx = toNumber(f.unitPrice) * qty;
    const shippingFx = toNumber(f.shipping);
    const goods = goodsFx * rate;
    const shipping = shippingFx * rate;
    const customs = (goods + shipping) * (toNumber(f.customs) / 100);
    const other = toNumber(f.other);
    const totalCost = goods + customs + shipping + other;
    const unitCost = qty > 0 ? totalCost / qty : 0;
    const revenue = toNumber(f.sell) * qty;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return {
      rate,
      goodsFx,
      shippingFx,
      customsFx: customs / rate,
      otherFx: other / rate,
      goods,
      shipping,
      customs,
      other,
      totalCost,
      totalFx: totalCost / rate,
      unitCost,
      revenue,
      profit,
      margin,
      breakeven: unitCost,
    };
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
    ["unitPrice", `${t("calc.unitPrice")} (${f.currency})`],
    ["qty", t("calc.qty")],
    ["shipping", `${t("calc.shipping")} (${f.currency})`],
    ["customs", t("calc.customs")],
    ["other", `${t("calc.other")} (${t("common.dzd")})`],
    ["sell", t("calc.sellPrice")],
  ] as const;

  const marginTone =
    r.profit < 0
      ? { label: t("calc.marginLoss"), cls: "text-destructive", bar: "bg-destructive" }
      : r.margin >= 25
        ? { label: t("calc.marginGood"), cls: "text-success", bar: "bg-success" }
        : r.margin >= 12
          ? { label: t("calc.marginOk"), cls: "text-warning", bar: "bg-warning" }
          : { label: t("calc.marginWeak"), cls: "text-destructive", bar: "bg-destructive" };

  return (
    <AppShell title={t("nav.calculator")}>
      <section className="glass-card space-y-3 p-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => setF(DEMO)}
        >
          <Sparkles className="size-4" /> {t("calc.demo")}
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="currency">{t("calc.currency")}</Label>
            <select
              id="currency"
              value={f.currency}
              onChange={(e) =>
                setF({ ...f, currency: e.target.value, rate: DEFAULT_RATES[e.target.value] ?? f.rate })
              }
              className="h-12 w-full rounded-md border border-input bg-surface px-3 text-base"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate">{`${t("calc.rate")} — 1 ${f.currency} = ? ${t("common.dzd")}`}</Label>
            <Input id="rate" className="h-12 text-base" inputMode="decimal" value={f.rate} onChange={set("rate")} />
          </div>
          {fields.map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} className="h-12 text-base" inputMode="decimal" value={f[key]} onChange={set(key)} />
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card space-y-2 p-4">
        <h2 className="font-bold">{t("calc.breakdown")}</h2>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span />
          <span className="flex gap-6">
            <span>{t("calc.inFx")}</span>
            <span>{t("calc.inDzd")}</span>
          </span>
        </div>
        {[
          [t("calc.goods"), r.goodsFx, r.goods],
          [t("calc.shipping"), r.shippingFx, r.shipping],
          [`${t("calc.customsAmount")} ${toNumber(f.customs)}%`, r.customsFx, r.customs],
          [t("calc.other"), r.otherFx, r.other],
          [t("calc.totalCost"), r.totalFx, r.totalCost],
        ].map(([label, fx, dzd], i, arr) => (
          <div
            key={label as string}
            className={`flex items-center justify-between gap-3 text-sm ${i === arr.length - 1 ? "border-t border-border pt-2 font-bold" : ""}`}
          >
            <span className={i === arr.length - 1 ? "" : "text-muted-foreground"}>{label}</span>
            <span className="flex gap-4 tabular-nums">
              <span className="text-muted-foreground">
                {formatDzd(fx as number, lang)} {f.currency}
              </span>
              <span>
                {formatDzd(dzd as number, lang)} {t("common.dzd")}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section className="glass-card space-y-2 p-4">
        {[
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
        <div className="mt-2 space-y-2 rounded-xl bg-primary/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("calc.profit")}</span>
            <span className={`text-lg font-extrabold ${marginTone.cls}`}>
              {formatDzd(r.profit, lang)} {t("common.dzd")} · {r.margin.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-all ${marginTone.bar}`}
              style={{ width: `${Math.min(100, Math.max(4, Math.abs(r.margin)))}%` }}
            />
          </div>
          <p className={`text-xs font-semibold ${marginTone.cls}`}>{marginTone.label}</p>
        </div>
        <Button className="h-12 w-full" onClick={() => void save()} disabled={r.totalCost <= 0}>
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
