import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Settings } from "./order";

export type Product = {
  id: string;
  category: "protein" | "special" | "drink";
  name: string;
  description: string;
  price: number | null;
  image_url: string | null;
  available: boolean;
  sort_order: number;
};
export type Side = { id: string; name: string; available: boolean; sort_order: number };
export type Size = { code: string; label: string; price: number; available: boolean; sort_order: number };

export type Menu = { products: Product[]; sides: Side[]; sizes: Size[]; settings: Settings };

async function fetchMenu(): Promise<Menu> {
  const [p, si, sz, st] = await Promise.all([
    supabase.from("products").select("*").order("sort_order"),
    supabase.from("sides").select("*").order("sort_order"),
    supabase.from("sizes").select("*").order("sort_order"),
    supabase.from("settings").select("*").eq("id", 1).single(),
  ]);
  const err = p.error || si.error || sz.error || st.error;
  if (err) throw new Error(err.message);
  return {
    products: (p.data ?? []).map((r) => ({ ...r, price: r.price == null ? null : Number(r.price) })) as Product[],
    sides: (si.data ?? []) as Side[],
    sizes: (sz.data ?? []).map((r) => ({ ...r, price: Number(r.price) })) as Size[],
    settings: { ...(st.data as unknown as Settings), delivery_fee: Number(st.data!.delivery_fee) },
  };
}

export const menuQuery = queryOptions({ queryKey: ["menu"], queryFn: fetchMenu, staleTime: 30_000 });
export const useMenu = () => useQuery(menuQuery);
