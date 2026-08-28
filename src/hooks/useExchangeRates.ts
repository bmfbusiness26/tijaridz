import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Rate = { official: number; market: number };

export const FALLBACK_RATES: Record<string, Rate> = {
  USD: { official: 133, market: 238 },
  EUR: { official: 153, market: 278 },
  CNY: { official: 19.7, market: 36 },
};

export function useExchangeRates() {
  const { data, isLoading } = useQuery({
    queryKey: ["exchange_rates"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("exchange_rates")
        .select("currency, official_rate, market_rate");
      if (error) throw error;
      const map: Record<string, Rate> = {};
      for (const r of rows ?? []) {
        map[r.currency] = { official: Number(r.official_rate), market: Number(r.market_rate) };
      }
      return map;
    },
  });

  const rates: Record<string, Rate> = { ...FALLBACK_RATES, ...(data ?? {}) };
  return { rates, isLoading };
}
