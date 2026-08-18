import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { adminCreateCode, adminOverview, adminReviewReceipt, getReceiptUrl } from "@/lib/tijari.functions";
import { formatDate } from "@/lib/format";
import type { PlanId } from "@/lib/plans";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | تِجَارِي" },
      { name: "description", content: "إدارة المستخدمين، مراجعة وصولات CCP وتوليد رموز التفعيل في تِجَارِي." },
      { property: "og:title", content: "لوحة الإدارة | تِجَارِي" },
      { property: "og:description", content: "مراجعة الاشتراكات والوصولات." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const overviewFn = useServerFn(adminOverview);
  const createCodeFn = useServerFn(adminCreateCode);
  const reviewFn = useServerFn(adminReviewReceipt);
  const receiptUrlFn = useServerFn(getReceiptUrl);
  const [plan, setPlan] = useState<Exclude<PlanId, "free">>("trader");
  const [months, setMonths] = useState("12");

  const { data, error } = useQuery({
    queryKey: ["admin-overview", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: () => overviewFn({ data: undefined }),
  });

  const createCode = useMutation({
    mutationFn: () => createCodeFn({ data: { plan, months: Number(months) || 12 } }),
    onSuccess: (r) => {
      void navigator.clipboard.writeText(r.code);
      toast.success(r.code);
      void qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const review = useMutation({
    mutationFn: (v: { receiptId: string; approve: boolean }) =>
      reviewFn({ data: { receiptId: v.receiptId, approve: v.approve, months: 12 } }),
    onSuccess: () => {
      toast.success(t("common.saved"));
      void qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  if (error) {
    return (
      <AppShell title={t("admin.title")}>
        <p className="glass-card p-6 text-center text-sm text-muted-foreground">403</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("admin.title")}>
      <section className="grid grid-cols-4 gap-2">
        {[
          [t("admin.users"), data?.stats.users],
          [t("home.contracts"), data?.stats.contracts],
          [t("home.invoices"), data?.stats.invoices],
          ["Paying", data?.stats.paying],
        ].map(([label, value]) => (
          <div key={label as string} className="glass-card px-2 py-3 text-center">
            <p className="text-xl font-extrabold text-gradient-gold">{value ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">{label as string}</p>
          </div>
        ))}
      </section>

      <Tabs defaultValue="receipts">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receipts">{t("admin.receipts")}</TabsTrigger>
          <TabsTrigger value="codes">{t("admin.codes")}</TabsTrigger>
          <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="mt-3 space-y-2">
          {(data?.receipts ?? []).map((r) => (
            <div key={r.id} className="glass-card space-y-2 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.plan}</span>
                <span className="text-[11px] text-muted-foreground">{formatDate(r.created_at, lang)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{r.status}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const { url } = await receiptUrlFn({ data: { path: r.storage_path } });
                    window.open(url, "_blank");
                  }}
                >
                  <ExternalLink className="size-4" />
                </Button>
                <Button size="sm" onClick={() => review.mutate({ receiptId: r.id, approve: true })}>
                  {t("admin.approve")}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => review.mutate({ receiptId: r.id, approve: false })}>
                  {t("admin.reject")}
                </Button>
              </div>
            </div>
          ))}
          {(data?.receipts ?? []).length === 0 ? (
            <p className="glass-card p-4 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          ) : null}
        </TabsContent>

        <TabsContent value="codes" className="mt-3 space-y-3">
          <div className="glass-card flex flex-wrap items-end gap-2 p-3">
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as Exclude<PlanId, "free">)}
              className="h-10 flex-1 rounded-md border border-input bg-surface px-3 text-sm"
            >
              <option value="trader">trader</option>
              <option value="importer">importer</option>
            </select>
            <Input className="w-20" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
            <Button disabled={createCode.isPending} onClick={() => createCode.mutate()}>
              {t("admin.generate")}
            </Button>
          </div>
          {(data?.codes ?? []).map((c) => (
            <div key={c.code} className="glass-card flex items-center justify-between p-3 text-sm">
              <span className="font-mono" dir="ltr">
                {c.code}
              </span>
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {c.used_by ? "used" : c.plan}
                <button type="button" onClick={() => void navigator.clipboard.writeText(c.code)}>
                  <Copy className="size-3.5" />
                </button>
              </span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="users" className="mt-3 space-y-2">
          {(data?.users ?? []).map((u) => (
            <div key={u.id} className="glass-card flex items-center justify-between p-3 text-sm">
              <span className="flex flex-col">
                <span className="font-semibold">{u.full_name ?? "—"}</span>
                <span className="text-[11px] text-muted-foreground">{u.phone ?? u.company_name ?? ""}</span>
              </span>
              <span className="text-[11px] font-semibold text-primary">{u.subscription?.plan ?? "free"}</span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
