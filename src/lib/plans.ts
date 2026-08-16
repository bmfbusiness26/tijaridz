export type PlanId = "free" | "trader" | "importer" | "enterprise";

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
    priceDzd: 1500,
    months: 1,
    monthlyContractLimit: 10,
    invoiceLimit: null,
    featureKeys: ["10", "unlimited-invoices", "calc", "support"],
  },
  importer: {
    id: "importer",
    nameKey: "sub.importer",
    priceDzd: 3500,
    months: 3,
    monthlyContractLimit: -1,
    invoiceLimit: null,
    featureKeys: ["unlimited", "unlimited-invoices", "calc", "priority"],
  },
  enterprise: {
    id: "enterprise",
    nameKey: "sub.enterprise",
    priceDzd: null,
    months: 12,
    monthlyContractLimit: -1,
    invoiceLimit: null,
    featureKeys: ["custom", "direct-support"],
  },
};

export const RIP = "00799999002379242202";
export const SUPPORT_WHATSAPP = "213675481854";

export const PLAN_ORDER: PlanId[] = ["free", "trader", "importer", "enterprise"];
