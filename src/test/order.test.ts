import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, computeTotals, isOpenNow, whatsappLink, type CartItem } from "@/lib/order";

const items: CartItem[] = [
  { key: "a", kind: "marmita", productId: "p", name: "Feijoada", sizeCode: "M", sizeLabel: "Média", sides: ["Farofa"], unitPrice: 25, qty: 2 },
  { key: "b", kind: "product", productId: "d", name: "Água sem gás", unitPrice: 4.5, qty: 1 },
];

describe("order totals", () => {
  it("adds delivery fee only for delivery", () => {
    expect(computeTotals(items, "delivery", 5)).toEqual({ subtotal: 54.5, fee: 5, total: 59.5 });
    expect(computeTotals(items, "pickup", 5)).toEqual({ subtotal: 54.5, fee: 0, total: 54.5 });
  });
  it("marmita prices P/M/G are 22/25/30", () => {
    const m = (p: number): CartItem => ({ key: "x", kind: "marmita", productId: "x", name: "x", unitPrice: p, qty: 1 });
    expect(computeTotals([m(22), m(25), m(30)], "pickup", 0).total).toBe(77);
  });
});

describe("whatsapp", () => {
  it("targets the official number and includes order data", () => {
    const msg = buildWhatsAppMessage(items, { name: "Ana", phone: "19 99999-0000", fulfillment: "delivery", street: "Rua A", number: "10", neighborhood: "Centro", payment: "Pix" }, 5);
    expect(msg).toContain("Ana");
    expect(msg).toContain("Marmita M (Média) – Feijoada");
    expect(msg).toContain("Farofa");
    expect(msg).toContain("Pix");
    expect(msg).toContain("R$ 59,50");
    expect(whatsappLink(msg).startsWith("https://wa.me/5519992006242?text=")).toBe(true);
  });
});

describe("opening hours (São Paulo)", () => {
  const s = { open_time: "10:30", close_time: "14:30", open_days: [1, 2, 3, 4, 5, 6], force_closed: false };
  it("open on a Wednesday at noon", () => {
    expect(isOpenNow(s, new Date("2026-11-04T15:00:00Z"))).toBe(true); // 12:00 SP
  });
  it("closed after closing time and on Sunday", () => {
    expect(isOpenNow(s, new Date("2026-11-04T18:00:00Z"))).toBe(false);
    expect(isOpenNow(s, new Date("2026-11-08T15:00:00Z"))).toBe(false);
  });
});
