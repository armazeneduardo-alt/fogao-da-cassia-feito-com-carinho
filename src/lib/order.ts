// Pure order logic: totals, opening hours and the WhatsApp message.
export const WHATSAPP_NUMBER = "5519992006242";
export const WHATSAPP_DISPLAY = "(19) 99200-6242";
export const ADDRESS =
  "Av. Pres. Castelo Branco, 1796 – Vila Santa Claudina, Vinhedo – SP, CEP 13284-408";

export type CartItem = {
  key: string;
  kind: "marmita" | "product";
  productId: string;
  name: string;
  sizeCode?: string | undefined;
  sizeLabel?: string | undefined;
  sides?: string[] | undefined;
  notes?: string | undefined;
  unitPrice: number;
  qty: number;
};

export type Settings = {
  open_time: string;
  close_time: string;
  open_days: number[];
  hours_text: string;
  delivery_enabled: boolean;
  delivery_fee: number;
  pickup_enabled: boolean;
  delivery_info: string;
  force_closed: boolean;
};

export type Fulfillment = "delivery" | "pickup";
export type Payment = "Pix" | "Dinheiro" | "Cartão";

export type Customer = {
  name: string;
  phone: string;
  fulfillment: Fulfillment;
  street?: string | undefined;
  number?: string | undefined;
  neighborhood?: string | undefined;
  payment: Payment;
  changeFor?: string | undefined;
  notes?: string | undefined;
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function computeTotals(items: CartItem[], fulfillment: Fulfillment, deliveryFee: number) {
  const subtotal = round(items.reduce((s, i) => s + i.unitPrice * i.qty, 0));
  const fee = fulfillment === "delivery" && items.length > 0 ? round(deliveryFee) : 0;
  return { subtotal, fee, total: round(subtotal + fee) };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Returns current weekday (0=Sun) and minutes since midnight in São Paulo time. */
export function saoPauloNow(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hour = Number(get("hour")) % 24;
  return { day: days.indexOf(get("weekday")), minutes: hour * 60 + Number(get("minute")) };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function isOpenNow(s: Pick<Settings, "open_time" | "close_time" | "open_days" | "force_closed">, date?: Date) {
  if (s.force_closed) return false;
  const { day, minutes } = saoPauloNow(date);
  if (!s.open_days.includes(day)) return false;
  return minutes >= toMin(s.open_time) && minutes < toMin(s.close_time);
}

export function buildWhatsAppMessage(items: CartItem[], c: Customer, deliveryFee: number) {
  const { subtotal, fee, total } = computeTotals(items, c.fulfillment, deliveryFee);
  const lines: string[] = [];
  lines.push("*NOVO PEDIDO – Fogão da Cassia*", "");
  lines.push(`*Cliente:* ${c.name}`, `*Telefone:* ${c.phone}`, "");
  lines.push("*Itens:*");
  items.forEach((i) => {
    const title =
      i.kind === "marmita" ? `Marmita ${i.sizeCode} (${i.sizeLabel}) – ${i.name}` : i.name;
    lines.push(`• ${i.qty}x ${title} — ${brl(i.unitPrice * i.qty)}`);
    if (i.sides && i.sides.length) lines.push(`   Acompanhamentos: ${i.sides.join(", ")}`);
    if (i.kind === "marmita" && i.sides && i.sides.length === 0) lines.push("   Acompanhamentos: nenhum");
    if (i.notes) lines.push(`   Obs.: ${i.notes}`);
  });
  lines.push("");
  lines.push(`Subtotal: ${brl(subtotal)}`);
  if (c.fulfillment === "delivery") lines.push(`Taxa de entrega: ${brl(fee)}`);
  lines.push(`*Total: ${brl(total)}*`, "");
  if (c.fulfillment === "delivery") {
    lines.push("*Entrega:*", `${c.street}, ${c.number}`, `Bairro: ${c.neighborhood}`);
  } else {
    lines.push("*Retirada no estabelecimento*");
  }
  lines.push("");
  lines.push(`*Pagamento:* ${c.payment}${c.payment === "Dinheiro" && c.changeFor ? ` (troco para ${c.changeFor})` : ""}`);
  if (c.notes) lines.push("", `*Observações:* ${c.notes}`);
  return lines.join("\n");
}

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
