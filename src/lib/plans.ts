export type PlanId = "free" | "trader" | "importer";

export type Plan = {
  id: PlanId;
  nameKey: string;
  priceDzd: number | null;
  months: number;
  monthlyContractLimit: number; // -1 = unlimited
  invoiceLimit: number | null; // null = unlimited
  featureKeys: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    nameKey: "sub.free",
    priceDzd: 0,
    months: 0,
    monthlyContractLimit: 2,
    invoiceLimit: 5,
    featureKeys: ["2", "5", "archive"],
  },
  trader: {
    id: "trader",
    nameKey: "sub.trader",
    priceDzd: 15000,
    months: 12,
    monthlyContractLimit: 10,
    invoiceLimit: null,
    featureKeys: ["10", "unlimited-invoices", "calc", "support"],
  },
  importer: {
    id: "importer",
    nameKey: "sub.importer",
    priceDzd: 35000,
    months: 12,
    monthlyContractLimit: -1,
    invoiceLimit: null,
    featureKeys: ["unlimited", "unlimited-invoices", "calc", "priority"],
  },
};

export const RIP = "00799999002379242202";
export const SUPPORT_WHATSAPP = "213675481854";

export const PLAN_ORDER: PlanId[] = ["free", "trader", "importer"];
