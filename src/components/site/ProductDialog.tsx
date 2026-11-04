import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/order";
import { useCart } from "@/lib/cart";
import type { Menu, Product } from "@/lib/menu";

export type DialogTarget =
  | { mode: "marmita"; proteinId?: string; sizeCode?: string }
  | { mode: "product"; product: Product }
  | null;

export function ProductDialog({ target, onClose, menu }: { target: DialogTarget; onClose: () => void; menu: Menu }) {
  const cart = useCart();
  const proteins = menu.products.filter((p) => p.category === "protein");
  const sizes = menu.sizes;
  const sides = menu.sides;

  const [proteinId, setProteinId] = useState<string>();
  const [sizeCode, setSizeCode] = useState<string>();
  const [chosenSides, setChosenSides] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!target) return;
    setQty(1);
    setNotes("");
    if (target.mode === "marmita") {
      const firstP = proteins.find((p) => p.available);
      const pre = proteins.find((p) => p.id === target.proteinId && p.available);
      setProteinId((pre ?? firstP)?.id);
      const preS = sizes.find((s) => s.code === target.sizeCode && s.available);
      setSizeCode((preS ?? sizes.find((s) => s.code === "M" && s.available) ?? sizes.find((s) => s.available))?.code);
      setChosenSides(sides.filter((s) => s.available).map((s) => s.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const size = sizes.find((s) => s.code === sizeCode);
  const protein = proteins.find((p) => p.id === proteinId);
  const unit = target?.mode === "marmita" ? (size?.price ?? 0) : target?.mode === "product" ? (target.product.price ?? 0) : 0;
  const total = unit * qty;

  const image = useMemo(() => {
    if (target?.mode === "product") return target.product.image_url;
    return protein?.image_url;
  }, [target, protein]);

  const canAdd =
    target?.mode === "marmita"
      ? !!size?.available && !!protein?.available
      : target?.mode === "product"
        ? target.product.available && target.product.price != null
        : false;

  function handleAdd() {
    if (!target || !canAdd) return;
    const cleanNotes = notes.trim().slice(0, 200) || undefined;
    if (target.mode === "marmita" && size && protein) {
      cart.add({
        kind: "marmita",
        productId: protein.id,
        name: protein.name,
        sizeCode: size.code,
        sizeLabel: size.label,
        sides: [...chosenSides],
        notes: cleanNotes,
        unitPrice: size.price,
        qty,
      });
      toast.success(`Marmita ${size.code} de ${protein.name} adicionada`);
    } else if (target.mode === "product") {
      cart.add({ kind: "product", productId: target.product.id, name: target.product.name, notes: cleanNotes, unitPrice: target.product.price!, qty });
      toast.success(`${target.product.name} adicionado`);
    }
    onClose();
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        <div className="max-h-[calc(92dvh-88px)] overflow-y-auto">
          {image && (
            <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
              <img src={image} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="space-y-6 p-5 sm:p-6">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {target?.mode === "marmita" ? "Monte sua marmita" : target?.mode === "product" ? target.product.name : ""}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {target?.mode === "product" ? target.product.description : "Escolha o tamanho, a proteína e os acompanhamentos."}
              </DialogDescription>
            </div>

            {target?.mode === "marmita" && (
              <>
                <fieldset>
                  <legend className="mb-3 flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide">
                    Tamanho <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] text-ink-foreground">Obrigatório</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setSizeCode(s.code)}
                        aria-pressed={sizeCode === s.code}
                        className={cn(
                          "rounded-2xl border-2 p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40",
                          sizeCode === s.code ? "border-primary bg-primary/15 shadow-gold" : "border-border hover:border-primary/60",
                        )}
                      >
                        <span className="block font-display text-2xl font-extrabold">{s.code}</span>
                        <span className="block text-xs text-muted-foreground">{s.label}</span>
                        <span className="mt-1 block text-sm font-bold">{s.available ? brl(s.price) : "Esgotado"}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3 flex w-full items-center justify-between text-sm font-bold uppercase tracking-wide">
                    Proteína do dia <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] text-ink-foreground">Obrigatório</span>
                  </legend>
                  <div className="space-y-2">
                    {proteins.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!p.available}
                        onClick={() => setProteinId(p.id)}
                        aria-pressed={proteinId === p.id}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border-2 p-2 pr-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40",
                          proteinId === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/60",
                        )}
                      >
                        {p.image_url && <img src={p.image_url} alt="" className="size-12 rounded-xl object-cover" loading="lazy" />}
                        <span className="flex-1 font-semibold">{p.name}</span>
                        {!p.available ? (
                          <span className="text-xs font-semibold text-destructive">Indisponível</span>
                        ) : (
                          <span className={cn("grid size-6 place-items-center rounded-full border-2", proteinId === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                            {proteinId === p.id && <Check className="size-3.5" strokeWidth={3} />}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3 text-sm font-bold uppercase tracking-wide">Acompanhamentos</legend>
                  <div className="flex flex-wrap gap-2">
                    {sides.map((s) => {
                      const on = chosenSides.includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={!s.available}
                          aria-pressed={on}
                          onClick={() => setChosenSides((cur) => (on ? cur.filter((x) => x !== s.name) : [...cur, s.name]))}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:line-through disabled:opacity-40",
                            on ? "border-leaf bg-leaf/20 text-accent-foreground" : "border-border",
                          )}
                        >
                          {on && <Check className="size-4" strokeWidth={3} />}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}

            <div>
              <label htmlFor="item-notes" className="mb-2 block text-sm font-bold uppercase tracking-wide">
                Observações
              </label>
              <Textarea
                id="item-notes"
                value={notes}
                maxLength={200}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={target?.mode === "product" && target.product.category === "drink" ? "Ex.: sabor laranja, guaraná..." : "Ex.: sem cebola, pouco feijão..."}
                className="rounded-2xl"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t bg-card p-4">
          <div className="flex items-center rounded-full border">
            <button type="button" aria-label="Diminuir" className="grid size-11 place-items-center disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center font-bold" aria-live="polite">{qty}</span>
            <button type="button" aria-label="Aumentar" className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.min(99, q + 1))}>
              <Plus className="size-4" />
            </button>
          </div>
          <Button variant="hero" size="xl" className="flex-1 justify-between px-5" disabled={!canAdd} onClick={handleAdd}>
            <span>{canAdd ? "Adicionar" : "Indisponível"}</span>
            <span>{brl(total)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
