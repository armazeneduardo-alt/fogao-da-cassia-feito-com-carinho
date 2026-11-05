import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, Bike, Minus, Plus, ShoppingBag, Store, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import type { Menu } from "@/lib/menu";
import { brl, buildWhatsAppMessage, computeTotals, whatsappLink, type Fulfillment, type Payment } from "@/lib/order";

const baseSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 13, "Telefone inválido (com DDD)"),
  notes: z.string().trim().max(300).optional(),
  changeFor: z.string().trim().max(20).optional(),
});
const deliverySchema = z.object({
  street: z.string().trim().min(3, "Informe o endereço").max(120),
  number: z.string().trim().min(1, "Informe número/complemento").max(60),
  neighborhood: z.string().trim().min(2, "Informe o bairro").max(60),
});

type Form = { name: string; phone: string; street: string; number: string; neighborhood: string; notes: string; changeFor: string };

export function CartSheet({ menu }: { menu: Menu }) {
  const cart = useCart();
  const s = menu.settings;
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [fulfillment, setFulfillment] = useState<Fulfillment>(s.delivery_enabled ? "delivery" : "pickup");
  const [payment, setPayment] = useState<Payment>("Pix");
  const [form, setForm] = useState<Form>({ name: "", phone: "", street: "", number: "", neighborhood: "", notes: "", changeFor: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [sent, setSent] = useState<string | null>(null);

  const totals = computeTotals(cart.items, fulfillment, s.delivery_fee);

  // Items no longer available in the current menu
  const unavailable = cart.items.filter((i) => {
    const p = menu.products.find((x) => x.id === i.productId);
    if (!p || !p.available) return true;
    if (i.kind === "marmita") {
      const sz = menu.sizes.find((x) => x.code === i.sizeCode);
      return !sz || !sz.available;
    }
    return false;
  });

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  function finalize(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const b = baseSchema.safeParse(form);
    if (!b.success) b.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
    if (fulfillment === "delivery") {
      const d = deliverySchema.safeParse(form);
      if (!d.success) d.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
    }
    setErrors(errs as Partial<Record<keyof Form, string>>);
    if (Object.keys(errs).length) return;
    if (unavailable.length) return;

    const msg = buildWhatsAppMessage(
      cart.items,
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        fulfillment,
        street: form.street.trim(),
        number: form.number.trim(),
        neighborhood: form.neighborhood.trim(),
        payment,
        changeFor: form.changeFor.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
      s.delivery_fee,
    );
    const link = whatsappLink(msg);
    window.open(link, "_blank", "noopener");
    setSent(link);
  }

  function close(o: boolean) {
    cart.setOpen(o);
    if (!o) setTimeout(() => { setStep("cart"); if (sent) { cart.clear(); setSent(null); } }, 300);
  }

  return (
    <Sheet open={cart.open} onOpenChange={close}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          {step === "checkout" && !sent && (
            <button aria-label="Voltar ao carrinho" onClick={() => setStep("cart")} className="grid size-10 place-items-center rounded-full hover:bg-muted">
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <SheetTitle className="text-xl font-bold">{step === "cart" ? "Seu pedido" : "Finalizar pedido"}</SheetTitle>
            <SheetDescription className="text-xs">
              {step === "cart" ? `${cart.count} ${cart.count === 1 ? "item" : "itens"}` : "Confirmação pelo WhatsApp do restaurante"}
            </SheetDescription>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground">
              <ShoppingBag className="size-7" />
            </div>
            <h3 className="text-2xl font-bold">Quase lá!</h3>
            <p className="text-muted-foreground">
              Abrimos o WhatsApp com seu pedido pronto. É só <strong>enviar a mensagem</strong> — o restaurante confirma o pedido e o pagamento por lá.
            </p>
            <Button asChild variant="whatsapp" size="xl"><a href={sent} target="_blank" rel="noopener noreferrer">Abrir WhatsApp novamente</a></Button>
            <Button variant="ghost" onClick={() => close(false)}>Fechar e limpar carrinho</Button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="size-12 text-muted-foreground" />
            <p className="font-semibold">Seu carrinho está vazio</p>
            <p className="text-sm text-muted-foreground">Escolha sua marmita e ela aparece aqui.</p>
            <Button variant="hero" onClick={() => close(false)} asChild><a href="#cardapio">Ver cardápio</a></Button>
          </div>
        ) : step === "cart" ? (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {cart.items.map((i) => {
                const bad = unavailable.includes(i);
                return (
                  <li key={i.key} className="py-4">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold leading-tight">
                          {i.kind === "marmita" ? `Marmita ${i.sizeCode} · ${i.name}` : i.name}
                        </p>
                        {i.kind === "marmita" && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {i.sides && i.sides.length ? i.sides.join(", ") : "Sem acompanhamentos"}
                          </p>
                        )}
                        {i.notes && <p className="mt-1 text-sm italic text-muted-foreground">“{i.notes}”</p>}
                        {bad && <p className="mt-1 text-sm font-semibold text-destructive">Indisponível no momento — remova para continuar</p>}
                      </div>
                      <p className="shrink-0 font-bold">{brl(i.unitPrice * i.qty)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full border">
                        <button aria-label="Diminuir quantidade" className="grid size-10 place-items-center" onClick={() => cart.setQty(i.key, i.qty - 1)}>
                          <Minus className="size-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{i.qty}</span>
                        <button aria-label="Aumentar quantidade" className="grid size-10 place-items-center" onClick={() => cart.setQty(i.key, i.qty + 1)}>
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <button onClick={() => cart.remove(i.key)} className="inline-flex min-h-10 items-center gap-1 px-2 text-sm font-medium text-destructive">
                        <Trash2 className="size-4" /> Remover
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="space-y-3 border-t bg-card p-5">
              <FulfillmentToggle value={fulfillment} onChange={setFulfillment} s={s} />
              <Totals totals={totals} fulfillment={fulfillment} />
              <Button variant="hero" size="xl" className="w-full" disabled={unavailable.length > 0} onClick={() => setStep("checkout")}>
                Continuar
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={finalize} noValidate className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <FulfillmentToggle value={fulfillment} onChange={setFulfillment} s={s} />
              <Field label="Nome" id="name" error={errors.name}>
                <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} maxLength={80} />
              </Field>
              <Field label="Telefone / WhatsApp" id="phone" error={errors.phone}>
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(19) 99999-9999" value={form.phone} onChange={set("phone")} maxLength={20} />
              </Field>
              {fulfillment === "delivery" ? (
                <>
                  <Field label="Endereço de entrega" id="street" error={errors.street}>
                    <Input id="street" autoComplete="street-address" placeholder="Rua / Avenida" value={form.street} onChange={set("street")} maxLength={120} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Número e complemento" id="number" error={errors.number}>
                      <Input id="number" placeholder="123, apto 4" value={form.number} onChange={set("number")} maxLength={60} />
                    </Field>
                    <Field label="Bairro" id="neighborhood" error={errors.neighborhood}>
                      <Input id="neighborhood" value={form.neighborhood} onChange={set("neighborhood")} maxLength={60} />
                    </Field>
                  </div>
                  {s.delivery_info && <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">{s.delivery_info}</p>}
                </>
              ) : (
                <p className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">
                  Retirada na Rua Ana Formágio, 38 – Valinhos.
                </p>
              )}
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Forma de pagamento</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(["Pix", "Dinheiro", "Cartão"] as Payment[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      aria-pressed={payment === p}
                      onClick={() => setPayment(p)}
                      className={cn("min-h-12 rounded-xl border-2 text-sm font-semibold", payment === p ? "border-primary bg-primary/15" : "border-border")}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">O pagamento é combinado com o restaurante no WhatsApp.</p>
              </fieldset>
              {payment === "Dinheiro" && (
                <Field label="Troco para quanto? (opcional)" id="changeFor" error={errors.changeFor}>
                  <Input id="changeFor" inputMode="decimal" placeholder="R$ 50,00" value={form.changeFor} onChange={set("changeFor")} maxLength={20} />
                </Field>
              )}
              <Field label="Observações adicionais" id="notes" error={errors.notes}>
                <Textarea id="notes" value={form.notes} onChange={set("notes")} maxLength={300} placeholder="Ex.: portão azul, interfone 12" />
              </Field>
            </div>
            <div className="space-y-3 border-t bg-card p-5">
              <Totals totals={totals} fulfillment={fulfillment} />
              <Button type="submit" variant="whatsapp" size="xl" className="w-full uppercase tracking-wide">
                Finalizar pedido
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FulfillmentToggle({ value, onChange, s }: { value: Fulfillment; onChange: (f: Fulfillment) => void; s: Menu["settings"] }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="radiogroup" aria-label="Entrega ou retirada">
      {[
        { v: "delivery" as const, label: "Entrega", icon: Bike, on: s.delivery_enabled },
        { v: "pickup" as const, label: "Retirada", icon: Store, on: s.pickup_enabled },
      ].map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={!o.on}
          onClick={() => onChange(o.v)}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all disabled:opacity-40",
            value === o.v ? "bg-card shadow-card" : "text-muted-foreground",
          )}
        >
          <o.icon className="size-4" /> {o.label}
        </button>
      ))}
    </div>
  );
}

function Totals({ totals, fulfillment }: { totals: ReturnType<typeof computeTotals>; fulfillment: Fulfillment }) {
  return (
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{brl(totals.subtotal)}</dd></div>
      {fulfillment === "delivery" && (
        <div className="flex justify-between"><dt className="text-muted-foreground">Taxa de entrega</dt><dd>{totals.fee ? brl(totals.fee) : "Grátis"}</dd></div>
      )}
      <div className="flex justify-between pt-1 text-lg font-extrabold"><dt>Total</dt><dd>{brl(totals.total)}</dd></div>
    </dl>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
