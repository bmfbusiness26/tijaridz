import { PLANS, type PlanId } from "./plans";

export type SubscriptionRow = {
  plan: string;
  status: string;
  monthly_contract_limit: number;
  invoice_limit: number | null;
  expires_at: string | null;
};

export function effectiveSubscription(row: SubscriptionRow | null): SubscriptionRow {
  const free = PLANS.free;
  const fallback: SubscriptionRow = {
    plan: "free",
    status: "active",
    monthly_contract_limit: free.monthlyContractLimit,
    invoice_limit: free.invoiceLimit,
    expires_at: null,
  };
  if (!row) return fallback;
  const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
  if (expired || row.status !== "active") return fallback;
  return row;
}

export function startOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function planFromId(id: string): PlanId {
  return (["free", "trader", "importer"] as PlanId[]).includes(id as PlanId) ? (id as PlanId) : "free";
}

const SYSTEM_PROMPT = `أنت مستشار قانوني وتجاري خبير في عقود الاستيراد الدولية، متخصص في السوق الجزائري (الجمارك، البنك المركزي، التوطين البنكي، Incoterms).
حلّل العقد المُعطى وأعد تقريراً بلغة المستخدم المطلوبة بصيغة Markdown بالأقسام التالية بالضبط:
## ملخص العقد
## الأطراف والالتزامات
## الشروط المالية وطريقة الدفع
## Incoterms والشحن
## المخاطر والبنود الخطيرة (رتّبها من الأخطر)
## نقاط التفاوض المقترحة
## الامتثال الجزائري (التوطين البنكي، الجمارك، الوثائق المطلوبة)
## التقييم النهائي
اختم بسطر أخير بالضبط بهذا الشكل: RISK_LEVEL: low أو RISK_LEVEL: medium أو RISK_LEVEL: high`;

export async function runContractAnalysis(input: { name: string; text: string; lang: string }) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI_UNAVAILABLE");

  const langLabel = input.lang === "fr" ? "French" : input.lang === "en" ? "English" : "Arabic";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write the whole report in ${langLabel}.\nContract name: ${input.name}\n\nContract text:\n${input.text.slice(0, 60000)}`,
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("AI_RATE_LIMIT");
  if (res.status === 402) throw new Error("AI_CREDITS");
  if (!res.ok) {
    console.error("AI gateway error", res.status, await res.text());
    throw new Error("AI_FAILED");
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI_FAILED");

  const match = content.match(/RISK_LEVEL:\s*(low|medium|high)/i);
  const riskLevel = match?.[1]?.toLowerCase() ?? "medium";
  const analysis = content.replace(/RISK_LEVEL:\s*(low|medium|high)/i, "").trim();
  return { analysis, riskLevel };
}

export function generateActivationCode(plan: string) {
  const rand = (n: number) =>
    Array.from({ length: n }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  return `TIJARI-${plan.slice(0, 3).toUpperCase()}-${rand(4)}-${rand(4)}`;
}
