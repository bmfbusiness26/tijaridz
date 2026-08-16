import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PLANS, type PlanId } from "./plans";
import {
  effectiveSubscription,
  generateActivationCode,
  planFromId,
  runContractAnalysis,
  startOfMonthIso,
  type SubscriptionRow,
} from "./tijari.server";

export const getAccountOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [subRes, contractsRes, invoicesRes, calcRes, monthRes, roleRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan, status, monthly_contract_limit, invoice_limit, expires_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("contracts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("calculations").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonthIso()),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const sub = effectiveSubscription((subRes.data as SubscriptionRow | null) ?? null);
    return {
      subscription: sub,
      counts: {
        contracts: contractsRes.count ?? 0,
        invoices: invoicesRes.count ?? 0,
        calculations: calcRes.count ?? 0,
        contractsThisMonth: monthRes.count ?? 0,
      },
      isAdmin: (roleRes.data ?? []).some((r: { role: string }) => r.role === "admin"),
    };
  });

export const analyzeContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
        text: z.string().trim().min(80, "TEXT_TOO_SHORT").max(120000),
        lang: z.enum(["ar", "fr", "en"]).default("ar"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("plan, status, monthly_contract_limit, invoice_limit, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const sub = effectiveSubscription((subRow as SubscriptionRow | null) ?? null);

    if (sub.monthly_contract_limit >= 0) {
      const { count } = await supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonthIso());
      if ((count ?? 0) >= sub.monthly_contract_limit) throw new Error("QUOTA_EXCEEDED");
    }

    const { analysis, riskLevel } = await runContractAnalysis(data);

    const { data: inserted, error } = await supabase
      .from("contracts")
      .insert({
        user_id: userId,
        name: data.name,
        source_text: data.text.slice(0, 40000),
        analysis,
        risk_level: riskLevel,
      })
      .select("id, name, analysis, risk_level, created_at")
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const redeemActivationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().trim().min(6).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.code.toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("code, plan, duration_months, monthly_contract_limit, invoice_limit, used_by")
      .eq("code", code)
      .maybeSingle();

    if (!row) throw new Error("CODE_INVALID");
    if (row.used_by) throw new Error("CODE_USED");

    const expires = new Date();
    expires.setMonth(expires.getMonth() + (row.duration_months ?? 1));

    const { error: upsertError } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: row.plan,
        status: "active",
        monthly_contract_limit: row.monthly_contract_limit,
        invoice_limit: row.invoice_limit,
        expires_at: expires.toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upsertError) throw new Error(upsertError.message);

    await supabaseAdmin
      .from("activation_codes")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("code", code);

    return { plan: row.plan, expiresAt: expires.toISOString() };
  });

async function assertAdmin(context: {
  supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> };
  userId: string;
}) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("FORBIDDEN");
}

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, subs, receipts, codes, contracts, invoices] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone, company_name, created_at").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("subscriptions").select("user_id, plan, status, expires_at"),
      supabaseAdmin.from("payment_receipts").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("activation_codes").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("contracts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("invoices").select("id", { count: "exact", head: true }),
    ]);

    const subMap = new Map((subs.data ?? []).map((s) => [s.user_id, s]));
    const users = (profiles.data ?? []).map((p) => ({ ...p, subscription: subMap.get(p.id) ?? null }));

    return {
      users,
      receipts: receipts.data ?? [],
      codes: codes.data ?? [],
      stats: {
        users: users.length,
        contracts: contracts.count ?? 0,
        invoices: invoices.count ?? 0,
        paying: (subs.data ?? []).filter((s) => s.plan !== "free" && s.status === "active").length,
      },
    };
  });

export const adminCreateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ plan: z.enum(["trader", "importer", "enterprise"]), months: z.number().int().min(1).max(24) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plan = PLANS[data.plan as PlanId];
    const code = generateActivationCode(data.plan);

    const { error } = await supabaseAdmin.from("activation_codes").insert({
      code,
      plan: data.plan,
      duration_months: data.months,
      monthly_contract_limit: plan.monthlyContractLimit,
      invoice_limit: plan.invoiceLimit,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { code };
  });

export const adminReviewReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        receiptId: z.string().uuid(),
        approve: z.boolean(),
        months: z.number().int().min(1).max(24).default(1),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: receipt } = await supabaseAdmin
      .from("payment_receipts")
      .select("id, user_id, plan, status")
      .eq("id", data.receiptId)
      .maybeSingle();
    if (!receipt) throw new Error("RECEIPT_NOT_FOUND");

    if (!data.approve) {
      await supabaseAdmin
        .from("payment_receipts")
        .update({ status: "rejected", admin_note: data.note ?? null })
        .eq("id", receipt.id);
      return { status: "rejected" as const };
    }

    const plan = PLANS[planFromId(receipt.plan)];
    const expires = new Date();
    expires.setMonth(expires.getMonth() + data.months);

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: receipt.user_id,
        plan: plan.id,
        status: "active",
        monthly_contract_limit: plan.monthlyContractLimit,
        invoice_limit: plan.invoiceLimit,
        expires_at: expires.toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("payment_receipts")
      .update({ status: "approved", admin_note: data.note ?? null })
      .eq("id", receipt.id);

    return { status: "approved" as const, expiresAt: expires.toISOString() };
  });

export const getReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: signed, error } = await supabase.storage.from("receipts").createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
