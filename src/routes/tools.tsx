import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { formatDzd, toNumber } from "@/lib/format";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "أدوات المستورد الجزائري | تِجَارِي" },
      { name: "description", content: "محول العملات، حاسبة الرسوم الجمركية، ودليل الموانئ الجزائرية للمستوردين." },
      { property: "og:title", content: "أدوات المستورد الجزائري | تِجَارِي" },
      { property: "og:description", content: "كل ما يحتاجه المستورد: صرف، جمارك، وموانئ." },
    ],
  }),
  component: ToolsPage,
});

const RATES: { code: string; official: number; market: number }[] = [
  { code: "EUR", official: 145, market: 245 },
  { code: "USD", official: 134, market: 228 },
  { code: "CNY", official: 18.6, market: 32 },
  { code: "TRY", official: 3.9, market: 6.6 },
  { code: "AED", official: 36.5, market: 62 },
];

const DUTIES: { key: string; label: string; rate: number }[] = [
  { key: "raw", label: "مواد أولية", rate: 5 },
  { key: "equipment", label: "تجهيزات ومعدات", rate: 15 },
  { key: "semi", label: "منتجات نصف مصنعة", rate: 30 },
  { key: "final", label: "منتجات نهائية / استهلاكية", rate: 60 },
];

const PORTS = [
  { name: "ميناء الجزائر", note: "الحاويات والبضائع العامة" },
  { name: "ميناء وهران", note: "الغرب الجزائري" },
  { name: "ميناء عنابة", note: "الشرق · الحديد والصلب" },
  { name: "ميناء بجاية", note: "حاويات · سريع التفريغ" },
  { name: "ميناء جن جن (جيجل)", note: "ميناء عميق للحاويات الكبيرة" },
];

function ToolsPage() {
  const { t, lang } = useI18n();
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("EUR");
  const [goodsValue, setGoodsValue] = useState("");
  const [dutyKey, setDutyKey] = useState("final");

  const rate = RATES.find((r) => r.code === currency) ?? RATES[0]!;
  const amt = toNumber(amount);

  const customs = useMemo(() => {
    const value = toNumber(goodsValue);
    const duty = (DUTIES.find((d) => d.key === dutyKey) ?? DUTIES[3]!).rate;
    const dutyAmount = value * (duty / 100);
    const vat = (value + dutyAmount) * 0.19;
    return { dutyAmount, vat, total: value + dutyAmount + vat, duty };
  }, [goodsValue, dutyKey]);

  return (
    <AppShell title={t("nav.tools")}>
      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("tools.currency")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="amt">{t("tools.amount")}</Label>
            <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cur">{t("tools.from")}</Label>
            <select
              id="cur"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            >
              {RATES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-primary/10 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">{t("tools.official")}</p>
            <p className="font-extrabold text-primary">{formatDzd(amt * rate.official, lang)}</p>
          </div>
          <div className="rounded-xl bg-warning/10 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">{t("tools.market")}</p>
            <p className="font-extrabold text-warning">{formatDzd(amt * rate.market, lang)}</p>
          </div>
        </div>
      </section>

      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("tools.customs")}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="gv">{t("tools.goodsValue")}</Label>
          <Input id="gv" inputMode="decimal" value={goodsValue} onChange={(e) => setGoodsValue(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gt">{t("tools.goodsType")}</Label>
          <select
            id="gt"
            value={dutyKey}
            onChange={(e) => setDutyKey(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
          >
            {DUTIES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label} — {d.rate}%
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("tools.customs")} {customs.duty}%</span>
            <span className="font-semibold">{formatDzd(customs.dutyAmount, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("tools.vat")}</span>
            <span className="font-semibold">{formatDzd(customs.vat, lang)}</span>
          </div>
          <div className="mt-1 flex justify-between rounded-xl bg-primary/10 px-3 py-2">
            <span className="text-muted-foreground">{t("calc.totalCost")}</span>
            <span className="font-extrabold text-primary">
              {formatDzd(customs.total, lang)} {t("common.dzd")}
            </span>
          </div>
        </div>
      </section>

      <section className="glass-card space-y-2 p-4">
        <h2 className="font-bold">{t("tools.ports")}</h2>
        {PORTS.map((p) => (
          <div key={p.name} className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
            <span className="font-semibold">{p.name}</span>
            <span className="text-[11px] text-muted-foreground">{p.note}</span>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
