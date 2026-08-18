import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Languages, Loader2, Lock, ShieldAlert, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { analyzeContract } from "@/lib/tijari.functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/contracts")({
  head: () => ({
    meta: [
      { title: "تحليل عقود الاستيراد | تِجَارِي" },
      { name: "description", content: "حلّل عقود الاستيراد بالذكاء الاصطناعي: المخاطر، Incoterms، الدفع والامتثال الجزائري." },
      { property: "og:title", content: "تحليل عقود الاستيراد | تِجَارِي" },
      { property: "og:description", content: "تقرير ذكي عن مخاطر عقد الاستيراد ونقاط التفاوض في دقائق." },
    ],
  }),
  component: ContractsPage,
});

const RISK_STYLES: Record<string, string> = {
  low: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  high: "bg-destructive/15 text-destructive",
};

const CARD_FIELDS = [
  ["parties", "contracts.parties"],
  ["value", "contracts.value"],
  ["payment", "contracts.payment"],
  ["delivery", "contracts.delivery"],
  ["flags", "contracts.flags"],
] as const;

function parseCard(analysis: string | null) {
  if (!analysis) return null;
  const out: Record<string, string> = {};
  for (const [key] of CARD_FIELDS) {
    const m = new RegExp(`^\\s*-?\\s*${key}\\s*:\\s*(.+)$`, "im").exec(analysis);
    if (m?.[1]) out[key] = m[1].trim();
  }
  return Object.keys(out).length ? out : null;
}

function stripCard(analysis: string | null) {
  return (analysis ?? "").replace(/^\s*-?\s*(parties|value|payment|delivery|flags)\s*:.*$/gim, "").trim();
}

function ContractsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzeContract);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: contracts } = useQuery({
    queryKey: ["contracts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, name, analysis, risk_level, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const analyze = useMutation({
    mutationFn: () => analyzeFn({ data: { name: name.trim(), text: text.trim(), lang } }),
    onSuccess: (row) => {
      toast.success(t("common.saved"));
      setName("");
      setText("");
      setOpenId(row.id);
      void qc.invalidateQueries({ queryKey: ["contracts"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error: Error) => {
      const map: Record<string, string> = {
        QUOTA_EXCEEDED: t("contracts.quotaOver"),
        AI_RATE_LIMIT: "الخدمة مشغولة حالياً، حاول بعد قليل",
        AI_CREDITS: "رصيد الذكاء الاصطناعي غير كافٍ",
      };
      toast.error(map[error.message] ?? t("common.error"));
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["contracts"] });
    void qc.invalidateQueries({ queryKey: ["overview"] });
  }

  return (
    <AppShell title={t("nav.contracts")}>
      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("contracts.new")}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="c-name">{t("contracts.name")}</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="عقد استيراد أحذية - الصين" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-text">{t("contracts.text")}</Label>
          <Textarea id="c-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Languages className="size-3 shrink-0" /> {t("contracts.langs")}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" /> {t("common.privacyNote")}
        </p>
        <Button
          className="h-12 w-full"
          disabled={analyze.isPending || name.trim().length < 2 || text.trim().length < 80}
          onClick={() => analyze.mutate()}
        >
          {analyze.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t("contracts.analyzing")}
            </>
          ) : (
            t("contracts.analyze")
          )}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 font-bold">{t("contracts.archive")}</h2>
        {(contracts ?? []).length === 0 ? (
          <p className="glass-card p-4 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : null}
        {(contracts ?? []).map((c) => (
          <article key={c.id} className="glass-card overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-4 text-start"
              onClick={() => setOpenId(openId === c.id ? null : c.id)}
            >
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{c.name}</span>
                <span className="text-[11px] text-muted-foreground">{formatDate(c.created_at, lang)}</span>
              </span>
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  RISK_STYLES[c.risk_level ?? "medium"] ?? RISK_STYLES["medium"]
                }`}
              >
                <ShieldAlert className="size-3" />
                {c.risk_level ?? "medium"}
              </span>
            </button>
            {openId === c.id ? (
              <div className="border-t border-border p-4">
                {parseCard(c.analysis) ? (
                  <div className="mb-4 space-y-2 rounded-xl bg-primary/8 p-3">
                    <p className="text-xs font-bold text-primary">{t("contracts.summary")}</p>
                    {CARD_FIELDS.map(([key, labelKey]) => {
                      const value = parseCard(c.analysis)?.[key];
                      if (!value) return null;
                      return (
                        <div key={key} className="text-[13px] leading-relaxed">
                          <span className="font-semibold">{t(labelKey)}: </span>
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-foreground/90">
                  {stripCard(c.analysis)}
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    {t("common.print")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(`${c.name}\n\n${(c.analysis ?? "").slice(0, 1500)}`)}`,
                        "_blank",
                      )
                    }
                  >
                    {t("common.share")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(c.id)}>
                    <Trash2 className="size-4" /> {t("common.delete")}
                  </Button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
