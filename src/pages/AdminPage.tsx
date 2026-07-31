import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Crown, LogOut, Trash2, Plus, Copy, X, Image as ImageIcon, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchCandidates, fetchCategories, fetchRankings } from "@/lib/public-data";
import type { MediaItem } from "@/components/media-gallery";
import { usePageTitle } from "@/hooks/use-page-title";

type Tab = "ranking" | "votos" | "candidatas" | "jurados";
type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Juror = Database["public"]["Tables"]["jurors"]["Row"];
type Vote = Database["public"]["Tables"]["votes"]["Row"];
type RankingRow = Database["public"]["Views"]["candidate_rankings"]["Row"];

export default function AdminPage() {
  usePageTitle("Admin — Reina de Jujuy");
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("ranking");

  async function logout() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <span className="font-display text-lg">Administración</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              Ver sitio
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4">
          <nav className="flex gap-1 border-b">
            {(["ranking", "votos", "candidatas", "jurados"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium capitalize border-b-2 ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "ranking" && <RankingTab />}
        {tab === "votos" && <LiveVotesTab />}
        {tab === "candidatas" && <CandidatesTab />}
        {tab === "jurados" && <JurorsTab />}
      </main>
    </div>
  );
}

function RankingTab() {
  const qc = useQueryClient();
  const rankings = useQuery<RankingRow[]>({
    queryKey: ["rankings"],
    queryFn: fetchRankings,
    refetchInterval: 3000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        qc.invalidateQueries({ queryKey: ["rankings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div>
      <h2 className="mb-4 font-display text-2xl">Ranking en vivo</h2>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Candidata</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Promedio</th>
              <th className="px-4 py-2 text-right">Votos</th>
            </tr>
          </thead>
          <tbody>
            {rankings.data?.map((r, i) => (
              <tr key={r.candidate_id} className="border-t">
                <td className="px-4 py-3">
                  {i === 0 ? <Crown className="h-4 w-4 text-gold" /> : i + 1}
                </td>
                <td className="px-4 py-3 font-medium">
                  {r.name}
                  {r.number ? ` · Nº${r.number}` : ""}
                </td>
                <td className="px-4 py-3 text-right font-display text-lg">{r.total_score}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {Number(r.average_score).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{r.votes_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CandidatesTab() {
  const qc = useQueryClient();
  const candidates = useQuery({ queryKey: ["candidates"], queryFn: fetchCandidates });
  const emptyMedia = (): MediaItem[] => [
    { type: "photo", url: "" },
    { type: "photo", url: "" },
    { type: "video", url: "" },
  ];
  const [form, setForm] = useState({
    name: "",
    number: "",
    locality: "",
    description: "",
    media: emptyMedia(),
  });

  function updateItem(idx: number, patch: Partial<MediaItem>) {
    setForm((f) => ({
      ...f,
      media: f.media.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    }));
  }

  function addItem(type: "photo" | "video") {
    setForm((f) => ({ ...f, media: [...f.media, { type, url: "" }] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, media: f.media.filter((_, i) => i !== idx) }));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const media = form.media.filter((m) => m.url.trim().length > 0);
    const photoCount = media.filter((m) => m.type === "photo").length;
    if (media.length < 3) {
      toast.error("Cargá al menos 3 archivos multimedia (fotos o videos).");
      return;
    }
    const firstPhoto = media.find((m) => m.type === "photo")?.url ?? null;
    const { error } = await supabase.from("candidates").insert({
      name: form.name.trim(),
      number: form.number ? Number(form.number) : null,
      locality: form.locality.trim() || null,
      description: form.description.trim() || null,
      photo_url: firstPhoto,
      media,
    });
    if (error) return toast.error(error.message);
    toast.success(`Candidata agregada (${photoCount} fotos, ${media.length - photoCount} videos)`);
    setForm({ name: "", number: "", locality: "", description: "", media: emptyMedia() });
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["rankings"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar candidata? Se borrarán sus votos.")) return;
    const { error } = await supabase.from("candidates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["rankings"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div>
        <h2 className="mb-4 font-display text-2xl">Candidatas</h2>
        <div className="space-y-2">
          {candidates.data?.map((c) => {
            const mediaArr: MediaItem[] = Array.isArray(c.media) ? c.media : [];
            const photos = mediaArr.filter((m) => m.type === "photo").length;
            const videos = mediaArr.filter((m) => m.type === "video").length;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                {c.photo_url ? (
                  <img
                    src={c.photo_url}
                    alt={c.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gradient-jujuy" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.number ? `Nº ${c.number}` : ""}
                    {c.number && c.locality ? " · " : ""}
                    {c.locality ?? ""}
                  </div>
                  {c.description ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {photos}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Film className="h-3 w-3" />
                      {videos}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {(!candidates.data || candidates.data.length === 0) && (
            <p className="text-sm text-muted-foreground">Aún no hay candidatas.</p>
          )}
        </div>
      </div>
      <form onSubmit={add} className="h-fit space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg">Agregar candidata</h3>
        <input
          placeholder="Nombre completo"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Número"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="Localidad"
            value={form.locality}
            onChange={(e) => setForm({ ...form, locality: e.target.value })}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <textarea
          placeholder="Descripción breve"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Multimedia (mín. 3)
            </label>
            <span className="text-[10px] text-muted-foreground">
              {form.media.filter((m) => m.url.trim()).length} cargados
            </span>
          </div>
          <div className="space-y-2">
            {form.media.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={m.type}
                  onChange={(e) => updateItem(idx, { type: e.target.value as "photo" | "video" })}
                  className="rounded-lg border bg-background px-2 py-2 text-xs"
                >
                  <option value="photo">Foto</option>
                  <option value="video">Video</option>
                </select>
                <input
                  placeholder={m.type === "photo" ? "https://…/foto.jpg" : "YouTube / Vimeo / .mp4"}
                  value={m.url}
                  onChange={(e) => updateItem(idx, { url: e.target.value })}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label="Quitar"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => addItem("photo")}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <ImageIcon className="h-3 w-3" /> Foto
            </button>
            <button
              type="button"
              onClick={() => addItem("video")}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <Film className="h-3 w-3" /> Video
            </button>
          </div>
        </div>
        <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-gold py-2.5 text-sm font-semibold text-gold-foreground shadow-gold">
          <Plus className="h-4 w-4" /> Agregar candidata
        </button>
      </form>
    </div>
  );
}

function JurorsTab() {
  const qc = useQueryClient();
  const jurors = useQuery({
    queryKey: ["jurors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jurors").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [name, setName] = useState("");

  function genCode() {
    return "JUJ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase
      .from("jurors")
      .insert({ name: name.trim(), access_code: genCode() });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["jurors"] });
    toast.success("Jurado agregado");
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar jurado? Se borrarán sus votos.")) return;
    const { error } = await supabase.from("jurors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["jurors"] });
    qc.invalidateQueries({ queryKey: ["rankings"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h2 className="mb-4 font-display text-2xl">Jurados</h2>
        <div className="space-y-2">
          {jurors.data?.map((j) => (
            <div key={j.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <div className="flex-1">
                <div className="font-medium">{j.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-2 py-0.5 font-mono">{j.access_code}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(j.access_code);
                      toast.success("Código copiado");
                    }}
                    className="rounded p-1 hover:bg-muted"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => remove(j.id)}
                className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(!jurors.data || jurors.data.length === 0) && (
            <p className="text-sm text-muted-foreground">Aún no hay jurados.</p>
          )}
        </div>
      </div>
      <form onSubmit={add} className="h-fit space-y-3 rounded-2xl border bg-card p-5">
        <h3 className="font-display text-lg">Agregar jurado</h3>
        <p className="text-xs text-muted-foreground">Se generará un código único de acceso.</p>
        <input
          placeholder="Nombre del jurado"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </form>
    </div>
  );
}

function LiveVotesTab() {
  const qc = useQueryClient();
  const candidates = useQuery({ queryKey: ["candidates"], queryFn: fetchCandidates });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const jurors = useQuery({
    queryKey: ["jurors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jurors").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const votes = useQuery<Vote[]>({
    queryKey: ["all-votes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("juror_id, candidate_id, category_id, score, updated_at");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-live-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        qc.invalidateQueries({ queryKey: ["all-votes"] });
        qc.invalidateQueries({ queryKey: ["rankings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const cats = categories.data ?? [];
  const cands = candidates.data ?? [];
  const jur = jurors.data ?? [];
  const map = new Map<string, number>();
  (votes.data ?? []).forEach((v) =>
    map.set(`${v.juror_id}:${v.candidate_id}:${v.category_id}`, v.score),
  );

  const totalEsperado = jur.length * cands.length * cats.length;
  const emitidos = votes.data?.length ?? 0;
  const pct = totalEsperado ? Math.round((emitidos / totalEsperado) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Votos en vivo</h2>
          <p className="text-sm text-muted-foreground">
            Puntajes de cada jurado, actualizados en tiempo real.
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">Progreso: </span>
          <span className="font-display text-gold">
            {emitidos}/{totalEsperado}
          </span>
          <span className="text-muted-foreground"> ({pct}%)</span>
        </div>
      </div>
      {jur.length === 0 || cands.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Necesitás al menos una candidata y un jurado.
        </p>
      ) : (
        cands.map((c) => {
          const scores = jur.flatMap((j) =>
            cats
              .map((cat) => map.get(`${j.id}:${c.id}:${cat.id}`))
              .filter((s): s is number => typeof s === "number"),
          );
          const total = scores.reduce((a, b) => a + b, 0);
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                <div className="font-medium">
                  {c.number ? `Nº ${c.number} · ` : ""}
                  {c.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-display text-gold">{total}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Jurado</th>
                      {cats.map((cat) => (
                        <th key={cat.id} className="px-3 py-2 text-center">
                          {cat.name}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jur.map((j) => {
                      const row = cats.map((cat) => map.get(`${j.id}:${c.id}:${cat.id}`));
                      const sub = row.reduce((a: number, b) => a + (b ?? 0), 0);
                      return (
                        <tr key={j.id} className="border-t">
                          <td className="px-4 py-2">{j.name}</td>
                          {row.map((s, i) => (
                            <td key={i} className="px-3 py-2 text-center">
                              {typeof s === "number" ? (
                                <span className="inline-block min-w-8 rounded-md bg-gold/15 px-2 py-0.5 font-semibold text-gold">
                                  {s}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right font-medium">{sub}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
