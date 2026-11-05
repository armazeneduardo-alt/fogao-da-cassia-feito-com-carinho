// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { menuQuery, useMenu, type Product } from "@/lib/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel do proprietário — V&M Restaurante Sabor Nobre" },
      { name: "description", content: "Gerencie cardápio, preços, fotos e horários do V&M Restaurante." },
      { property: "og:title", content: "Painel do proprietário — V&M Restaurante" },
      { property: "og:description", content: "Área restrita para gerenciar o cardápio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Status = "loading" | "out" | "notadmin" | "admin";

function AdminPage() {
  const [status, setStatus] = useState<Status>("loading");
  const check = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setStatus("out");
    const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    setStatus(ok ? "admin" : "notadmin");
  };
  useEffect(() => {
    check();
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") check();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link to="/" className="font-bold">← Voltar ao site</Link>
        {status !== "out" && status !== "loading" && (
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sair</Button>
        )}
      </header>
      <main className="mx-auto max-w-4xl p-4">
        {status === "loading" && <p>Carregando…</p>}
        {status === "out" && <Login />}
        {status === "notadmin" && <p>Esta conta não tem acesso de proprietário.</p>}
        {status === "admin" && <Dashboard />}
      </main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    if (mode === "up" && !res.data.session) toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
  };
  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm space-y-4 rounded-3xl border bg-card p-6">
      <h1 className="text-2xl font-bold">{mode === "in" ? "Entrar no painel" : "Criar conta do proprietário"}</h1>
      <div className="space-y-1"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-1"><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Criar conta"}</Button>
      <button type="button" className="w-full text-sm underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
      </button>
    </form>
  );
}

function Dashboard() {
  const { data, isLoading } = useMenu();
  if (isLoading || !data) return <p>Carregando…</p>;
  return (
    <Tabs defaultValue="products">
      <TabsList className="mb-4">
        <TabsTrigger value="products">Pratos e bebidas</TabsTrigger>
        <TabsTrigger value="sizes">Tamanhos</TabsTrigger>
        <TabsTrigger value="sides">Acompanhamentos</TabsTrigger>
        <TabsTrigger value="settings">Horários e entrega</TabsTrigger>
      </TabsList>
      <TabsContent value="products" className="space-y-3">
        <NewProduct />
        {data.products.map((p) => <ProductRow key={p.id} p={p} />)}
      </TabsContent>
      <TabsContent value="sizes" className="space-y-3">
        {data.sizes.map((s) => <SizeRow key={s.code} s={s} />)}
      </TabsContent>
      <TabsContent value="sides" className="space-y-3">
        <NewSide />
        {data.sides.map((s) => <SideRow key={s.id} s={s} />)}
      </TabsContent>
      <TabsContent value="settings"><SettingsForm s={data.settings as any} /></TabsContent>
    </Tabs>
  );
}

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: menuQuery.queryKey });
}
function done(error: { message: string } | null, refresh: () => void, msg = "Salvo!") {
  if (error) return toast.error(error.message);
  toast.success(msg);
  refresh();
}

const categoryLabel: Record<string, string> = { protein: "Marmita", special: "Especial", drink: "Bebida" };

function ProductRow({ p }: { p: Product }) {
  const refresh = useRefresh();
  const [f, setF] = useState({ name: p.name, description: p.description, price: p.price?.toString() ?? "" });
  const [uploading, setUploading] = useState(false);
  const save = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("products").update(patch).eq("id", p.id);
    done(error, refresh);
  };
  const upload = async (file: File) => {
    setUploading(true);
    const path = `${p.id}-${Date.now()}.${file.name.split(".").pop()}`;
    const up = await supabase.storage.from("product-images").upload(path, file);
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setUploading(false);
    if (data) save({ image_url: data.signedUrl });
  };
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row">
      <div className="shrink-0">
        {p.image_url ? <img src={p.image_url} alt={p.name} className="size-24 rounded-xl object-cover" /> : <div className="size-24 rounded-xl bg-muted" />}
        <label className="mt-1 block cursor-pointer text-center text-xs underline">
          {uploading ? "Enviando…" : "Trocar foto"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{categoryLabel[p.category]}</div>
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Descrição" />
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-32" inputMode="decimal" placeholder="Preço" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><Switch checked={p.available} onCheckedChange={(v) => save({ available: v })} />Disponível</label>
          <Button size="sm" onClick={() => save({ name: f.name, description: f.description, price: f.price === "" ? null : Number(f.price.replace(",", ".")) })}>Salvar</Button>
          <Button size="sm" variant="outline" onClick={async () => {
            if (!confirm(`Excluir "${p.name}"?`)) return;
            const { error } = await supabase.from("products").delete().eq("id", p.id);
            done(error, refresh, "Excluído");
          }}>Excluir</Button>
        </div>
      </div>
    </div>
  );
}

function NewProduct() {
  const refresh = useRefresh();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("protein");
  const [price, setPrice] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed p-4">
      <Input className="flex-1 min-w-40" placeholder="Novo item" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="h-9 rounded-md border bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="protein">Marmita</option><option value="special">Especial</option><option value="drink">Bebida</option>
      </select>
      <Input className="w-28" placeholder="Preço" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Button disabled={!name} onClick={async () => {
        const { error } = await supabase.from("products").insert({ name, category, price: price ? Number(price.replace(",", ".")) : null, sort_order: 999 });
        done(error, refresh, "Adicionado");
        setName(""); setPrice("");
      }}>Adicionar</Button>
    </div>
  );
}

function SizeRow({ s }: { s: { code: string; label: string; price: number; available: boolean } }) {
  const refresh = useRefresh();
  const [label, setLabel] = useState(s.label);
  const [price, setPrice] = useState(String(s.price));
  const save = async (patch: Record<string, unknown>) => done((await supabase.from("sizes").update(patch).eq("code", s.code)).error, refresh);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4">
      <Input className="flex-1 min-w-40" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Input className="w-28" value={price} onChange={(e) => setPrice(e.target.value)} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={s.available} onCheckedChange={(v) => save({ available: v })} />Disponível</label>
      <Button size="sm" onClick={() => save({ label, price: Number(price.replace(",", ".")) })}>Salvar</Button>
    </div>
  );
}

function SideRow({ s }: { s: { id: string; name: string; available: boolean } }) {
  const refresh = useRefresh();
  const [name, setName] = useState(s.name);
  const save = async (patch: Record<string, unknown>) => done((await supabase.from("sides").update(patch).eq("id", s.id)).error, refresh);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4">
      <Input className="flex-1 min-w-40" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="flex items-center gap-2 text-sm"><Switch checked={s.available} onCheckedChange={(v) => save({ available: v })} />Disponível</label>
      <Button size="sm" onClick={() => save({ name })}>Salvar</Button>
      <Button size="sm" variant="outline" onClick={async () => done((await supabase.from("sides").delete().eq("id", s.id)).error, refresh, "Excluído")}>Excluir</Button>
    </div>
  );
}

function NewSide() {
  const refresh = useRefresh();
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2 rounded-2xl border border-dashed p-4">
      <Input placeholder="Novo acompanhamento" value={name} onChange={(e) => setName(e.target.value)} />
      <Button disabled={!name} onClick={async () => { done((await supabase.from("sides").insert({ name, sort_order: 999 })).error, refresh, "Adicionado"); setName(""); }}>Adicionar</Button>
    </div>
  );
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function SettingsForm({ s }: { s: Record<string, any> }) {
  const refresh = useRefresh();
  const [f, setF] = useState({ ...s, delivery_fee: String(s.delivery_fee) });
  const set = (k: string, v: unknown) => setF({ ...f, [k]: v });
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <label className="flex items-center gap-2"><Switch checked={f.force_closed} onCheckedChange={(v) => set("force_closed", v)} />Fechar a loja agora (pausa os pedidos)</label>
      <div className="flex gap-3">
        <div><Label>Abre</Label><Input type="time" value={f.open_time} onChange={(e) => set("open_time", e.target.value)} /></div>
        <div><Label>Fecha</Label><Input type="time" value={f.close_time} onChange={(e) => set("close_time", e.target.value)} /></div>
      </div>
      <div>
        <Label>Dias de funcionamento</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {DAYS.map((d, i) => {
            const on = f.open_days.includes(i);
            return <Button key={d} type="button" size="sm" variant={on ? "default" : "outline"} onClick={() => set("open_days", on ? f.open_days.filter((x: number) => x !== i) : [...f.open_days, i].sort())}>{d}</Button>;
          })}
        </div>
      </div>
      <div><Label>Texto de horário</Label><Input value={f.hours_text} onChange={(e) => set("hours_text", e.target.value)} /></div>
      <label className="flex items-center gap-2"><Switch checked={f.delivery_enabled} onCheckedChange={(v) => set("delivery_enabled", v)} />Entrega</label>
      <label className="flex items-center gap-2"><Switch checked={f.pickup_enabled} onCheckedChange={(v) => set("pickup_enabled", v)} />Retirada</label>
      <div><Label>Taxa de entrega (R$)</Label><Input className="w-32" value={f.delivery_fee} onChange={(e) => set("delivery_fee", e.target.value)} /></div>
      <div><Label>Informações de entrega</Label><Textarea value={f.delivery_info} onChange={(e) => set("delivery_info", e.target.value)} /></div>
      <Button onClick={async () => {
        const { id, ...rest } = f;
        const { error } = await supabase.from("settings").update({ ...rest, delivery_fee: Number(String(f.delivery_fee).replace(",", ".")) }).eq("id", 1);
        done(error, refresh);
      }}>Salvar</Button>
    </div>
  );
}
