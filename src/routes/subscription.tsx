import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getAccountOverview, redeemActivationCode } from "@/lib/tijari.functions";
import { PLANS, PLAN_ORDER, RIP, SUPPORT_WHATSAPP, type PlanId } from "@/lib/plans";
import { formatDate, formatDzd } from "@/lib/format";

export const Route = createFileRoute("/subscription")({
  head: () => ({
    meta: [
      { title: "الاشتراك والدفع عبر CCP | تِجَارِي" },
      { name: "description", content: "اختر خطة تِجَارِي، ادفع عبر التحويل البريدي CCP وفعّل حسابك برمز التفعيل." },
      { property: "og:title", content: "الاشتراك والدفع عبر CCP | تِجَارِي" },
      { property: "og:description", content: "خطط مرنة للتاجر والمستورد الجزائري." },
    ],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const overviewFn = useServerFn(getAccountOverview);
  const redeemFn = useServerFn(redeemActivationCode);
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<PlanId>("trader");
  const [uploading, setUploading] = useState(false);

  const { data } = useQuery({
    queryKey: ["overview", user?.id],
    enabled: !!user,
    queryFn: () => overviewFn({ data: undefined }),
  });

  const { data: receipts } = useQuery({
    queryKey: ["receipts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("payment_receipts")
        .select("id, plan, status, created_at")
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const redeem = useMutation({
    mutationFn: () => redeemFn({ data: { code: code.trim() } }),
    onSuccess: () => {
      toast.success(t("sub.activated"));
      setCode("");
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: Error) =>
      toast.error(e.message === "CODE_USED" ? "الرمز مستعمل مسبقاً" : e.message === "CODE_INVALID" ? "رمز غير صالح" : t("common.error")),
  });

  async function uploadReceipt(file: File) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
    if (upErr) {
      setUploading(false);
      toast.error(t("common.error"));
      return;
    }
    const { error } = await supabase.from("payment_receipts").insert({
      user_id: user.id,
      plan: selected,
      amount: PLANS[selected].priceDzd,
      storage_path: path,
      status: "pending",
    });
    setUploading(false);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("sub.uploaded"));
    void qc.invalidateQueries({ queryKey: ["receipts"] });
  }

  const current = data?.subscription;

  return (
    <AppShell title={t("nav.subscription")}>
      <section className="glass-card flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{t("sub.current")}</p>
          <p className="text-lg font-extrabold text-primary">{t(PLANS[(current?.plan as PlanId) ?? "free"].nameKey)}</p>
        </div>
        {current?.expires_at ? (
          <p className="text-xs text-muted-foreground">
            {t("sub.expires")} {formatDate(current.expires_at, lang)}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        {PLAN_ORDER.filter((p) => p !== "free").map((id) => {
          const plan = PLANS[id];
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`glass-card w-full p-4 text-start transition-colors ${active ? "border-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{t(plan.nameKey)}</span>
                <span className="font-extrabold text-primary">
                  {plan.priceDzd === null ? "—" : `${formatDzd(plan.priceDzd, lang)} ${t("common.dzd")}`}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {plan.monthlyContractLimit < 0 ? "تحاليل غير محدودة" : `${plan.monthlyContractLimit} تحاليل/شهر`} ·{" "}
                {plan.invoiceLimit === null ? "فواتير غير محدودة" : `${plan.invoiceLimit} فواتير`} ·{" "}
                {lang === "ar" ? "اشتراك سنوي" : lang === "fr" ? "abonnement annuel" : "yearly plan"}
              </p>
              {active ? <Check className="mt-2 size-4 text-primary" /> : null}
            </button>
          );
        })}
      </section>

      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("sub.pay")}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("sub.payDesc")}</p>
        <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 font-mono text-sm">
          <span dir="ltr">{RIP}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(RIP);
              toast.success(t("common.saved"));
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <Label htmlFor="receipt" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 py-6 text-sm font-semibold text-primary">
          <Upload className="size-4" />
          {uploading ? t("common.loading") : t("sub.upload")}
        </Label>
        <input
          id="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadReceipt(file);
          }}
        />
        <a
          href={`https://wa.me/${SUPPORT_WHATSAPP}`}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-xs text-muted-foreground underline"
        >
          WhatsApp +{SUPPORT_WHATSAPP}
        </a>
        {(receipts ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t(PLANS[r.plan as PlanId]?.nameKey ?? "sub.free")} · {formatDate(r.created_at, lang)}
            </span>
            <span className="font-semibold">{r.status}</span>
          </div>
        ))}
      </section>

      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("sub.code")}</h2>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="TIJ-XXXX-XXXX" />
          <Button disabled={redeem.isPending || code.trim().length < 6} onClick={() => redeem.mutate()}>
            {t("sub.activate")}
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
