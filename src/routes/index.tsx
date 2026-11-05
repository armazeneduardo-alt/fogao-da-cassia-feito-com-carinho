import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, MapPin, MessageCircle, Navigation, Plus, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMenu, type Menu, type Product } from "@/lib/menu";
import { useCart } from "@/lib/cart";
import { ADDRESS, WHATSAPP_DISPLAY, brl, isOpenNow, whatsappLink } from "@/lib/order";
import { ProductDialog, type DialogTarget } from "@/components/site/ProductDialog";
import { CartSheet } from "@/components/site/CartSheet";
import logo from "@/assets/vm-logo.png.asset.json";
import hero from "@/assets/hero.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "V&M Restaurante Sabor Nobre – Comida Caseira em Valinhos | Peça sua marmita" },
      { name: "description", content: "Marmitas caseiras em Valinhos-SP: calabresa, feijoada, frango frito, costelinha e parmegiana. Monte sua marmita e peça pelo WhatsApp." },
      { property: "og:title", content: "V&M Restaurante Sabor Nobre – Comida caseira, sabor de verdade!" },
      { property: "og:description", content: "Escolha sua marmita e peça agora pelo WhatsApp. Entrega e retirada em Valinhos-SP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const MAPS_QUERY = encodeURIComponent("V&M Restaurante Sabor Nobre, Rua Ana Formágio, 38, Valinhos - SP, 13272-785");

function Home() {
  const { data: menu, isLoading, error, refetch } = useMenu();
  const [target, setTarget] = useState<DialogTarget>(null);

  return (
    <div className="min-h-screen pb-28 md:pb-0">
      <Header />
      <Hero menu={menu} />
      <main id="cardapio" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        {isLoading && <MenuSkeleton />}
        {error && (
          <div className="rounded-3xl border bg-card p-8 text-center">
            <p className="font-semibold">Não conseguimos carregar o cardápio.</p>
            <Button className="mt-4" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        )}
        {menu && <MenuSections menu={menu} onPick={setTarget} />}
      </main>
      <Location menu={menu} />
      <Footer />
      {menu && (
        <>
          <ProductDialog target={target} onClose={() => setTarget(null)} menu={menu} />
          <CartSheet menu={menu} />
        </>
      )}
      <FloatingCart />
    </div>
  );
}

function Header() {
  const cart = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-ink-foreground/10 bg-ink/90 text-ink-foreground backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5" aria-label="V&M Sabor Nobre – início">
          <img src={logo.url} alt="" className="h-10 w-auto" height={40} />
          <span className="font-display text-lg font-bold leading-none">
            V&M Sabor Nobre
            <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-primary">Comida caseira</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <a href="#cardapio" className="hover:text-primary">Cardápio</a>
          <a href="#bebidas" className="hover:text-primary">Bebidas</a>
          <a href="#localizacao" className="hover:text-primary">Localização</a>
        </nav>
        <Button variant="hero" size="sm" className="h-10 px-4" onClick={() => cart.setOpen(true)} aria-label={`Abrir carrinho, ${cart.count} itens`}>
          <ShoppingBag /> <span className="hidden sm:inline">Carrinho</span>
          {cart.count > 0 && <span className="rounded-full bg-ink px-1.5 text-xs text-ink-foreground">{cart.count}</span>}
        </Button>
      </div>
    </header>
  );
}

function OpenBadge({ menu }: { menu?: Menu | undefined }) {
  if (!menu) return <span className="inline-block h-8 w-44 animate-pulse rounded-full bg-ink-foreground/10" />;
  const open = isOpenNow(menu.settings);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-3 py-1.5 text-sm">
      <span className={cn("size-2.5 rounded-full", open ? "bg-leaf shadow-[0_0_0_4px] shadow-leaf/25" : "bg-destructive")} />
      <strong>{open ? "Aberto agora" : "Fechado agora"}</strong>
      <span className="text-ink-muted">· {menu.settings.hours_text}</span>
    </span>
  );
}

function Hero({ menu }: { menu?: Menu | undefined }) {
  return (
    <section className="relative overflow-hidden bg-ink text-ink-foreground">
      <img
        src={hero.url}
        alt="Marmita com costelinha, arroz, feijão, farofa e macarrão"
        className="absolute inset-0 h-full w-full object-cover object-[70%_center] md:left-auto md:w-[65%]"
        fetchPriority="high"
      />
      <div className="absolute inset-0 hero-scrim-mobile md:hero-scrim" />
      <div className="relative mx-auto flex min-h-[620px] max-w-6xl flex-col justify-end px-4 pb-12 pt-40 sm:px-6 md:min-h-[600px] md:justify-center md:pt-16">
        <div className="max-w-xl animate-rise">
          <img src={logo.url} alt="Logo V&M Restaurante Sabor Nobre" className="mb-6 hidden h-28 w-auto md:block" height={112} />
          <OpenBadge menu={menu} />
          <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl">
            Comida caseira,{" "}
            <span className="font-script text-6xl font-bold text-primary sm:text-7xl lg:text-8xl">sabor de verdade!</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-muted">
            Seu almoço favorito está aqui. Escolha sua marmita e peça agora!
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild variant="hero" size="xl"><a href="#cardapio">Ver cardápio</a></Button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm"
            >
              <span className="flex text-primary" aria-hidden>
                {[0, 1, 2, 3].map((i) => <Star key={i} className="size-4 fill-current" />)}
                <Star className="size-4 fill-current opacity-40" />
              </span>
              <span><strong>4,5</strong> <span className="text-ink-muted">(32 avaliações no Google)</span></span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <div id={id} className="mb-6 scroll-mt-24">
      <p className="font-script text-2xl text-leaf">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold sm:text-4xl">{title}</h2>
    </div>
  );
}

function MenuSections({ menu, onPick }: { menu: Menu; onPick: (t: DialogTarget) => void }) {
  const proteins = menu.products.filter((p) => p.category === "protein");
  const specials = menu.products.filter((p) => p.category === "special");
  const drinks = menu.products.filter((p) => p.category === "drink");
  const open = isOpenNow(menu.settings);

  return (
    <div className="space-y-16">
      {!open && (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm">
          <strong>Estamos fechados agora.</strong> Você pode montar seu pedido e enviar — respondemos no próximo horário de atendimento ({menu.settings.hours_text}).
        </div>
      )}

      <section aria-labelledby="sizes-title">
        <SectionTitle eyebrow="feito com carinho" title="Monte sua marmita" />
        <h3 id="sizes-title" className="sr-only">Tamanhos</h3>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {menu.sizes.map((s) => (
            <button
              key={s.code}
              disabled={!s.available}
              onClick={() => onPick({ mode: "marmita", sizeCode: s.code })}
              className="group rounded-3xl border-2 border-border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-1 hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 sm:p-6"
            >
              <span className="font-display text-4xl font-extrabold sm:text-5xl">{s.code}</span>
              <span className="mt-1 block text-sm text-muted-foreground">Marmita {s.label}</span>
              <span className="mt-3 block text-lg font-bold sm:text-xl">{s.available ? brl(s.price) : "Esgotada"}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Acompanhamentos:</span>
          {menu.sides.map((s) => (
            <span key={s.id} className={cn("rounded-full px-3 py-1", s.available ? "bg-accent text-accent-foreground" : "bg-muted line-through")}>
              {s.name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="saindo do fogão" title="Opções do dia" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proteins.map((p, i) => (
            <ProductCard key={p.id} product={p} priceLabel={`a partir de ${brl(Math.min(...menu.sizes.filter((s) => s.available).map((s) => s.price), Infinity))}`} delay={i} onClick={() => onPick({ mode: "marmita", proteinId: p.id })} />
          ))}
        </div>
      </section>

      {specials.length > 0 && (
        <section>
          <SectionTitle eyebrow="a queridinha da casa" title="Marmita especial" />
          {specials.map((p) => (
            <article key={p.id} className="grid overflow-hidden rounded-[2rem] bg-ink text-ink-foreground shadow-lift md:grid-cols-2">
              <div className="relative aspect-[4/3] md:aspect-auto">
                {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">Destaque</span>
              </div>
              <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
                <h3 className="text-3xl font-extrabold sm:text-4xl">{p.name}</h3>
                <p className="text-ink-muted">{p.description}</p>
                <p className="font-display text-4xl font-extrabold text-primary">{p.price != null && brl(p.price)}</p>
                <Button variant="hero" size="xl" className="self-start" disabled={!p.available} onClick={() => onPick({ mode: "product", product: p })}>
                  {p.available ? "Quero essa" : "Indisponível hoje"}
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section>
        <SectionTitle id="bebidas" eyebrow="pra acompanhar" title="Bebidas" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {drinks.map((p, i) => (
            <ProductCard key={p.id} product={p} compact delay={i} priceLabel={p.price != null ? brl(p.price) : ""} onClick={() => onPick({ mode: "product", product: p })} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product: p, priceLabel, onClick, compact, delay = 0 }: { product: Product; priceLabel: string; onClick: () => void; compact?: boolean; delay?: number }) {
  return (
    <article
      className={cn("group relative flex animate-rise overflow-hidden rounded-3xl border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift", compact ? "flex-col" : "flex-row sm:flex-col", !p.available && "opacity-60")}
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <div className={cn("relative shrink-0 overflow-hidden bg-muted", compact ? "aspect-square" : "w-32 sm:aspect-[4/3] sm:w-full")}>
        {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        {!p.available && <span className="absolute inset-0 grid place-items-center bg-ink/60 text-sm font-bold text-ink-foreground">Indisponível</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-lg font-bold leading-tight">{p.name}</h3>
        {!compact && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-bold">{priceLabel}</span>
          <button
            onClick={onClick}
            disabled={!p.available}
            aria-label={`Adicionar ${p.name}`}
            className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-gold transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <Plus className="size-5" strokeWidth={3} />
          </button>
        </div>
      </div>
      {p.available && <button onClick={onClick} className="absolute inset-0 -z-0 opacity-0" tabIndex={-1} aria-hidden />}
    </article>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
    </div>
  );
}

function Location({ menu }: { menu?: Menu | undefined }) {
  return (
    <section id="localizacao" className="scroll-mt-16 bg-ink py-16 text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <p className="font-script text-2xl text-leaf">vem buscar ou a gente leva</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">V&M Restaurante Sabor Nobre</h2>
          <p className="flex gap-3 text-ink-muted"><MapPin className="mt-0.5 size-5 shrink-0 text-primary" /> {ADDRESS}</p>
          <p className="flex gap-3 text-ink-muted"><Clock className="mt-0.5 size-5 shrink-0 text-primary" /> {menu?.settings.hours_text ?? "…"}</p>
          <p className="flex gap-3 text-ink-muted"><MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" /> WhatsApp {WHATSAPP_DISPLAY}</p>
          {menu?.settings.delivery_enabled && <p className="text-sm text-ink-muted">{menu.settings.delivery_info}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="hero" size="lg" className="h-12">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`} target="_blank" rel="noopener noreferrer"><Navigation /> Como chegar</a>
            </Button>
            <Button asChild variant="whatsapp" size="lg" className="h-12">
              <a href={whatsappLink("Olá! Vim pelo site do V&M Sabor Nobre.")} target="_blank" rel="noopener noreferrer"><MessageCircle /> Conversar no WhatsApp</a>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-ink-foreground/10">
          <iframe
            title="Mapa – V&M Sabor Nobre"
            src={`https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`}
            className="h-80 w-full md:h-full md:min-h-96"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink pb-8 text-center text-xs text-ink-muted">
      <div className="mx-auto max-w-6xl border-t border-ink-foreground/10 px-4 pt-6">
        © {new Date().getFullYear()} V&M Sabor Nobre · Valinhos – SP ·{" "}
        <a href="/admin" className="underline-offset-2 hover:underline">Área do proprietário</a>
      </div>
    </footer>
  );
}

function FloatingCart() {
  const cart = useCart();
  if (cart.count === 0) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 p-3 md:hidden">
        <Button asChild variant="hero" size="xl" className="w-full"><a href="#cardapio">Fazer pedido</a></Button>
      </div>
    );
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 md:inset-x-auto md:bottom-6 md:right-6 md:p-0">
      <Button variant="ink" size="xl" className="w-full justify-between gap-6 shadow-lift md:w-auto" onClick={() => cart.setOpen(true)}>
        <span className="flex items-center gap-2">
          <span key={cart.count} className="grid size-7 animate-pop place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{cart.count}</span>
          Ver carrinho
        </span>
        <span className="font-bold text-primary">{brl(cart.items.reduce((s, i) => s + i.unitPrice * i.qty, 0))}</span>
      </Button>
    </div>
  );
}
