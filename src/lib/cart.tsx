import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "./order";

type CartCtx = {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE = "fogao-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE, JSON.stringify(items));
  }, [items, loaded]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      add: (item) =>
        setItems((prev) => {
          const sig = JSON.stringify([item.productId, item.sizeCode, item.sides, item.notes ?? ""]);
          const existing = prev.find(
            (p) => JSON.stringify([p.productId, p.sizeCode, p.sides, p.notes ?? ""]) === sig,
          );
          if (existing)
            return prev.map((p) => (p === existing ? { ...p, qty: Math.min(99, p.qty + item.qty) } : p));
          return [...prev, { ...item, key: crypto.randomUUID() }];
        }),
      setQty: (key, qty) =>
        setItems((prev) =>
          qty <= 0 ? prev.filter((p) => p.key !== key) : prev.map((p) => (p.key === key ? { ...p, qty: Math.min(99, qty) } : p)),
        ),
      remove: (key) => setItems((prev) => prev.filter((p) => p.key !== key)),
      clear: () => setItems([]),
      open,
      setOpen,
    }),
    [items, open],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
