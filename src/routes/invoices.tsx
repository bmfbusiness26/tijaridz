import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, MessageCircle, Plus, Printer, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { escapeHtml, formatDate, formatDzd, toNumber } from "@/lib/format";
import { useExchangeRates } from "@/hooks/useExchangeRates";

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

type Item = { desc: string; qty: string; price: string; tva: string };
type Profile = {
  company_name: string | null;
  company_address: string | null;
  company_rc: string | null;
  company_nif: string | null;
  company_cnas: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
};

const emptyItem = (tva = "19"): Item => ({ desc: "", qty: "1", price: "", tva });
const todayIso = () => new Date().toISOString().slice(0, 10);
const CURRENCIES = ["DZD", "EUR", "USD"];


function itemTotals(items: Item[]) {
  let ht = 0;
  let tva = 0;
  for (const it of items) {
    const line = toNumber(it.qty) * toNumber(it.price);
    ht += line;
    tva += line * (toNumber(it.tva) / 100);
  }
  return { ht, tva, ttc: ht + tva };
}

function InvoicesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { rates } = useExchangeRates();


  const [clientId, setClientId] = useState("");
  const [client, setClient] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [currency, setCurrency] = useState("DZD");
  const [rate, setRate] = useState("1");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [fText, setFText] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data as Profile | null;
    },
  });

  const { data: logoUrl } = useQuery({
    queryKey: ["logo", profile?.company_logo_url],
    enabled: !!profile?.company_logo_url,
    queryFn: async () => {
      const { data } = await supabase.storage.from("logos").createSignedUrl(profile!.company_logo_url!, 3600);
      return data?.signedUrl ?? null;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totals = itemTotals(items);
  const rateNum = currency === "DZD" ? 1 : toNumber(rate) || 1;

  const missing = [
    !profile?.company_name && t("settings.companyName"),
    !profile?.company_address && t("settings.address"),
    !profile?.company_rc && "RC",
    !profile?.company_nif && "NIF",
    !profile?.company_cnas && "CNAS",
  ].filter(Boolean) as string[];

  const monthSummary = useMemo(() => {
    const key = todayIso().slice(0, 7);
    let ht = 0;
    let tva = 0;
    let count = 0;
    for (const inv of invoices ?? []) {
      if (String(inv.invoice_date ?? inv.created_at).slice(0, 7) !== key) continue;
      const r = Number(inv.exchange_rate ?? 1) || 1;
      const base = Number(inv.amount) * r;
      ht += base;
      tva += base * (Number(inv.tva_rate) / 100);
      count += 1;
    }
    return { ht, tva, count };
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = fText.trim().toLowerCase();
    return (invoices ?? []).filter((inv) => {
      const date = String(inv.invoice_date ?? inv.created_at).slice(0, 10);
      if (q && !`${inv.client_name} ${inv.number}`.toLowerCase().includes(q)) return false;
      if (fStatus !== "all" && (inv.status ?? "unpaid") !== fStatus) return false;
      if (fFrom && date < fFrom) return false;
      if (fTo && date > fTo) return false;
      return true;
    });
  }, [invoices, fText, fStatus, fFrom, fTo]);

  function pickClient(id: string) {
    setClientId(id);
    const c = (clients ?? []).find((x) => x.id === id);
    if (!c) return;
    setClient(c.name);
    setClientNif(c.nif ?? "");
    setClientAddress(c.address ?? "");
    setClientPhone(c.phone ?? "");
    setClientEmail(c.email ?? "");
  }

  function resetForm() {
    setClientId("");
    setClient("");
    setClientNif("");
    setClientAddress("");
    setClientPhone("");
    setClientEmail("");
    setItems([emptyItem()]);
    setNotes("");
    setDueDate("");
  }

  async function create() {
    if (!user) return;
    setBusy(true);
    try {
      const { data: number, error: numError } = await supabase.rpc("next_invoice_number");
      if (numError || !number) throw new Error(numError?.message ?? "number");

      const cleanItems = items
        .filter((i) => i.desc.trim() || toNumber(i.price) > 0)
        .map((i) => ({ desc: i.desc.trim(), qty: toNumber(i.qty), price: toNumber(i.price), tva: toNumber(i.tva) }));
      const weightedTva = totals.ht > 0 ? (totals.tva / totals.ht) * 100 : 0;

      const { error } = await supabase.from("invoices").insert({
        user_id: user.id,
        number,
        client_name: client.trim(),
        client_nif: clientNif.trim() || null,
        client_address: clientAddress.trim() || null,
        client_phone: clientPhone.trim() || null,
        client_email: clientEmail.trim() || null,
        description: cleanItems.map((i) => i.desc).filter(Boolean).join(" · "),
        items: cleanItems,
        amount: totals.ht,
        tva_rate: Number(weightedTva.toFixed(2)),
        currency,
        exchange_rate: rateNum,
        invoice_date: issueDate,
        due_date: dueDate || null,
        notes: notes.trim() || null,
        status: "unpaid",
      });
      if (error) throw new Error(error.message);

      await supabase.from("clients").upsert(
        {
          user_id: user.id,
          name: client.trim(),
          nif: clientNif.trim() || null,
          address: clientAddress.trim() || null,
          phone: clientPhone.trim() || null,
          email: clientEmail.trim() || null,
        },
        { onConflict: "user_id,name" },
      );

      toast.success(t("common.saved"));
      resetForm();
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg.includes("limit") ? t("invoices.limit") : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  function duplicate(inv: Record<string, unknown>) {
    setClientId("");
    setClient(String(inv["client_name"] ?? ""));
    setClientNif(String(inv["client_nif"] ?? ""));
    setClientAddress(String(inv["client_address"] ?? ""));
    setClientPhone(String(inv["client_phone"] ?? ""));
    setClientEmail(String(inv["client_email"] ?? ""));
    setCurrency(String(inv["currency"] ?? "DZD"));
    setRate(String(inv["exchange_rate"] ?? "1"));
    const raw = Array.isArray(inv["items"]) ? (inv["items"] as Record<string, unknown>[]) : [];
    setItems(
      raw.length
        ? raw.map((i) => ({
            desc: String(i["desc"] ?? ""),
            qty: String(i["qty"] ?? 1),
            price: String(i["price"] ?? 0),
            tva: String(i["tva"] ?? 19),
          }))
        : [{ desc: String(inv["description"] ?? ""), qty: "1", price: String(inv["amount"] ?? 0), tva: String(inv["tva_rate"] ?? 19) }],
    );
    setIssueDate(todayIso());
    setDueDate("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function invoiceLines(inv: Record<string, unknown>) {
    const raw = Array.isArray(inv["items"]) ? (inv["items"] as Record<string, unknown>[]) : [];
    return raw.map((i) => ({
      desc: String(i["desc"] ?? ""),
      qty: Number(i["qty"] ?? 0),
      price: Number(i["price"] ?? 0),
      tva: Number(i["tva"] ?? 0),
    }));
  }

  function invoiceText(inv: Record<string, unknown>) {
    const ht = Number(inv["amount"] ?? 0);
    const ttc = ht * (1 + Number(inv["tva_rate"] ?? 0) / 100);
    const cur = String(inv["currency"] ?? "DZD");
    const parts = [
      `${t("inv.msgSubject")} ${String(inv["number"])}`,
      profile?.company_name ?? "",
      `${t("invoices.ht")}: ${formatDzd(ht, lang)} ${cur}`,
      `${t("invoices.total")}: ${formatDzd(ttc, lang)} ${cur}`,
    ];
    if (inv["due_date"]) parts.push(`${t("inv.dueOn")}: ${String(inv["due_date"])}`);
    return parts.filter(Boolean).join("\n");
  }

  function sendWhatsapp(inv: Record<string, unknown>) {
    const phone = String(inv["client_phone"] ?? "").replace(/[^\d]/g, "");
    if (!phone) {
      toast.error(t("inv.noPhone"));
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(invoiceText(inv))}`, "_blank");
  }

  function sendEmail(inv: Record<string, unknown>) {
    const email = String(inv["client_email"] ?? "");
    if (!email) {
      toast.error(t("inv.noEmail"));
      return;
    }
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`${t("inv.msgSubject")} ${String(inv["number"])}`)}&body=${encodeURIComponent(invoiceText(inv))}`;
  }

  function printInvoice(inv: Record<string, unknown>) {
    const lines = invoiceLines(inv);
    const cur = String(inv["currency"] ?? "DZD");
    const ht = Number(inv["amount"] ?? 0);
    const tvaAmount = ht * (Number(inv["tva_rate"] ?? 0) / 100);
    const rows = (lines.length ? lines : [{ desc: String(inv["description"] ?? ""), qty: 1, price: ht, tva: Number(inv["tva_rate"] ?? 0) }])
      .map(
        (i) =>
          `<tr><td>${i.desc}</td><td>${i.qty}</td><td>${formatDzd(i.price, lang)}</td><td>${i.tva}%</td><td>${formatDzd(i.qty * i.price, lang)}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${String(inv["number"])}</title>
<style>body{font-family:system-ui,Arial;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #ccc;padding:8px;font-size:13px;text-align:start}h1{font-size:20px}img{max-height:70px}
.tot{margin-top:16px;font-size:14px}.tot div{display:flex;justify-content:space-between;padding:4px 0}</style></head><body>
${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : ""}
<h1>${profile?.company_name ?? ""}</h1>
<p>${profile?.company_address ?? ""}<br/>RC ${profile?.company_rc ?? ""} · NIF ${profile?.company_nif ?? ""} · CNAS ${profile?.company_cnas ?? ""}</p>
<hr/>
<p><b>${String(inv["number"])}</b> — ${String(inv["invoice_date"] ?? "")}${inv["due_date"] ? ` · ${t("inv.dueOn")}: ${String(inv["due_date"])}` : ""}</p>
<p><b>${String(inv["client_name"] ?? "")}</b><br/>${String(inv["client_address"] ?? "")}<br/>${inv["client_nif"] ? `NIF ${String(inv["client_nif"])}` : ""}</p>
<table><thead><tr><th>${t("inv.itemDesc")}</th><th>${t("inv.qty")}</th><th>${t("inv.unitPrice")}</th><th>TVA</th><th>${t("inv.lineTotal")}</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot">
<div><span>${t("invoices.ht")}</span><span>${formatDzd(ht, lang)} ${cur}</span></div>
<div><span>${t("invoices.tvaAmount")}</span><span>${formatDzd(tvaAmount, lang)} ${cur}</span></div>
<div><b>${t("invoices.total")}</b><b>${formatDzd(ht + tvaAmount, lang)} ${cur}</b></div>
</div>
${inv["notes"] ? `<p>${String(inv["notes"])}</p>` : ""}
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  const statusTone: Record<string, string> = {
    paid: "border-success/50",
    unpaid: "border-warning/50",
    overdue: "border-destructive/50",
  };
  const statusText: Record<string, string> = {
    paid: "text-success",
    unpaid: "text-warning",
    overdue: "text-destructive",
  };

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
      ) : null}

      <section className="glass-card flex items-center gap-3 p-4">
        {logoUrl ? <img src={logoUrl} alt={profile?.company_name ?? "logo"} className="size-14 rounded-lg object-contain" /> : null}
        <div className="min-w-0 space-y-0.5 text-xs text-muted-foreground">
          <p className="text-sm font-bold text-foreground">{profile?.company_name ?? t("inv.company")}</p>
          <p className="truncate">{profile?.company_address}</p>
          <p dir="ltr" className="truncate font-mono">
            RC {profile?.company_rc ?? "—"} · NIF {profile?.company_nif ?? "—"} · CNAS {profile?.company_cnas ?? "—"}
          </p>
          <Link to="/settings" className="inline-block font-bold text-primary underline">
            {t("inv.logo")}
          </Link>
        </div>
      </section>

      {/* month summary */}
      <section className="glass-card grid grid-cols-3 gap-2 p-4 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">{t("inv.summarySales")}</p>
          <p className="font-extrabold text-primary">{formatDzd(monthSummary.ht, lang)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{t("inv.summaryTva")}</p>
          <p className="font-extrabold">{formatDzd(monthSummary.tva, lang)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{t("inv.summaryCount")}</p>
          <p className="font-extrabold">{monthSummary.count}</p>
        </div>
        <p className="col-span-3 text-[11px] text-muted-foreground">{t("inv.summaryTitle")}</p>
      </section>

      {/* new invoice */}
      <section className="glass-card space-y-4 p-4">
        <h2 className="font-bold">{t("invoices.new")}</h2>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-primary">{t("inv.clientBlock")}</p>
          {(clients ?? []).length ? (
            <div className="space-y-1.5">
              <Label htmlFor="c-pick">{t("inv.clientPick")}</Label>
              <select
                id="c-pick"
                value={clientId}
                onChange={(e) => (e.target.value ? pickClient(e.target.value) : resetForm())}
                className="h-12 w-full rounded-md border border-input bg-surface px-3 text-base"
              >
                <option value="">{t("inv.clientNew")}</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="i-client">{t("invoices.client")}</Label>
              <Input id="i-client" className="h-12 text-base" value={client} onChange={(e) => setClient(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-nif">{t("invoices.clientNif")}</Label>
              <Input id="i-nif" className="h-12 text-base" inputMode="numeric" value={clientNif} onChange={(e) => setClientNif(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-caddr">{t("inv.clientAddress")}</Label>
              <Input id="i-caddr" className="h-12 text-base" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-cphone">{t("inv.clientPhone")}</Label>
              <Input id="i-cphone" className="h-12 text-base" inputMode="tel" dir="ltr" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="i-cmail">{t("inv.clientEmail")}</Label>
              <Input id="i-cmail" className="h-12 text-base" inputMode="email" dir="ltr" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-primary">{t("inv.items")}</p>
          {items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-xl border border-border/70 p-3">
              <div className="flex items-center gap-2">
                <Input
                  className="h-12 text-base"
                  placeholder={t("inv.itemDesc")}
                  value={it.desc}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, desc: e.target.value } : x)))}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-12 shrink-0 text-destructive"
                  disabled={items.length === 1}
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("inv.qty")}</Label>
                  <Input
                    className="h-12 text-base"
                    inputMode="decimal"
                    value={it.qty}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">{t("inv.unitPrice")}</Label>
                  <Input
                    className="h-12 text-base"
                    inputMode="decimal"
                    value={it.price}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">TVA</Label>
                  <select
                    value={it.tva}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, tva: e.target.value } : x)))}
                    className="h-12 w-full rounded-md border border-input bg-surface px-2 text-base"
                  >
                    <option value="19">19%</option>
                    <option value="9">9%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
              </div>
              <p className="text-end text-xs text-muted-foreground">
                {t("inv.lineTotal")}: <span className="font-bold text-foreground">{formatDzd(toNumber(it.qty) * toNumber(it.price), lang)}</span> {currency}
              </p>
            </div>
          ))}
          <Button variant="outline" className="h-12 w-full" onClick={() => setItems([...items, emptyItem(items[items.length - 1]?.tva ?? "19")])}>
            <Plus className="size-4" /> {t("inv.addItem")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-date">{t("inv.issueDate")}</Label>
            <Input id="i-date" type="date" className="h-12 text-base" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-due">{t("inv.dueDate")}</Label>
            <Input id="i-due" type="date" className="h-12 text-base" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-cur">{t("invoices.currency")}</Label>
            <select
              id="i-cur"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setRate(DEFAULT_RATE[e.target.value] ?? "1");
              }}
              className="h-12 w-full rounded-md border border-input bg-surface px-3 text-base"
            >
              {CURRENCIES.map((c) => (
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="i-notes">{t("inv.notes")}</Label>
            <Textarea id="i-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1 rounded-xl bg-primary/10 px-4 py-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("invoices.ht")}</span>
            <span>
              {formatDzd(totals.ht, lang)} {currency}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("invoices.tvaAmount")}</span>
            <span>
              {formatDzd(totals.tva, lang)} {currency}
            </span>
          </div>
          <div className="flex justify-between font-extrabold text-primary">
            <span>{t("invoices.total")}</span>
            <span>
              {formatDzd(totals.ttc, lang)} {currency}
            </span>
          </div>
          {currency !== "DZD" ? (
            <p className="text-end text-[11px] text-muted-foreground">≈ {formatDzd(totals.ttc * rateNum, lang)} DZD</p>
          ) : null}
        </div>

        <p className="text-[11px] text-muted-foreground">{t("common.privacyNote")}</p>
        <Button className="h-12 w-full" disabled={busy || client.trim().length < 2 || totals.ht <= 0} onClick={() => void create()}>
          {t("invoices.create")}
        </Button>
      </section>

      {/* archive */}
      <section className="glass-card space-y-3 p-4">
        <h2 className="font-bold">{t("inv.filters")}</h2>
        <Input className="h-12 text-base" placeholder={t("inv.filterClient")} value={fText} onChange={(e) => setFText(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="h-12 w-full rounded-md border border-input bg-surface px-2 text-sm"
          >
            <option value="all">{t("inv.filterAll")}</option>
            <option value="paid">{t("inv.paid")}</option>
            <option value="unpaid">{t("inv.unpaid")}</option>
            <option value="overdue">{t("inv.overdue")}</option>
          </select>
          <Input type="date" className="h-12 text-sm" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          <Input type="date" className="h-12 text-sm" value={fTo} onChange={(e) => setFTo(e.target.value)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 font-bold">{t("invoices.archive")}</h2>
        {filtered.length === 0 ? <p className="glass-card p-4 text-center text-sm text-muted-foreground">{t("common.empty")}</p> : null}
        {filtered.map((inv) => {
          const status = (inv.status ?? "unpaid") as string;
          const ttc = Number(inv.amount) * (1 + Number(inv.tva_rate) / 100);
          return (
            <article key={inv.id} className={`glass-card space-y-2 border-2 p-4 ${statusTone[status] ?? ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{inv.client_name}</p>
                  <p className="text-[11px] text-muted-foreground" dir="ltr">
                    {inv.number} · {formatDate(inv.invoice_date ?? inv.created_at, lang)}
                    {inv.due_date ? ` · ${t("inv.dueOn")} ${formatDate(inv.due_date, lang)}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-extrabold text-primary">
                  {formatDzd(ttc, lang)} {inv.currency}
                </p>
              </div>
              {inv.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{inv.description}</p> : null}
              <select
                value={status}
                onChange={(e) => void setStatus(inv.id, e.target.value)}
                className={`h-10 w-full rounded-md border border-input bg-surface px-2 text-sm font-bold ${statusText[status] ?? ""}`}
              >
                <option value="unpaid">{t("inv.unpaid")}</option>
                <option value="paid">{t("inv.paid")}</option>
                <option value="overdue">{t("inv.overdue")}</option>
              </select>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => printInvoice(inv as unknown as Record<string, unknown>)}>
                  <Printer className="size-4" /> {t("common.print")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => sendWhatsapp(inv as unknown as Record<string, unknown>)}>
                  <MessageCircle className="size-4" /> {t("inv.sendWhatsapp")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => sendEmail(inv as unknown as Record<string, unknown>)}>
                  <Mail className="size-4" /> {t("inv.sendEmail")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => duplicate(inv as unknown as Record<string, unknown>)}>
                  <Copy className="size-4" /> {t("inv.duplicate")}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(inv.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
