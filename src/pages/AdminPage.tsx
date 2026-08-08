import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import {
  Crown,
  LogOut,
  Trash2,
  Plus,
  Copy,
  X,
  Image as ImageIcon,
  Film,
  Pencil,
  Eye,
  ChevronLeft,
  Download,
} from "lucide-react";
import { jsPDF } from "jspdf";
import appHero from "@/assets/jujuy-hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchCandidates, fetchCategories, fetchRankings } from "@/lib/public-data";
import type { MediaItem } from "@/components/media-gallery";
import { usePageTitle } from "@/hooks/use-page-title";
import { formatImageUrl } from "@/lib/utils";
import { CandidateDetails } from "@/components/candidate-details";

type Contest = "Embajadora" | "chico10";
type Tab = "ranking" | "votos" | "candidatas" | "jurados";
type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Juror = Database["public"]["Tables"]["jurors"]["Row"];
type Vote = Database["public"]["Tables"]["votes"]["Row"];
type RankingRow = Database["public"]["Views"]["candidate_rankings"]["Row"];

export default function AdminPage() {
  usePageTitle("Admin — Embajadora de Jujuy");
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("ranking");
  const [contest, setContest] = useState<Contest>("Embajadora");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/auth", { replace: true });
      }
      setLoading(false);
    }
    checkAuth();
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
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
        {(tab === "ranking" || tab === "votos" || tab === "candidatas") && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {([
              { value: "Embajadora", label: "Embajadora" },
              { value: "chico10", label: "Chico 10" },
            ] as const).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setContest(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  contest === item.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        {tab === "ranking" && <RankingTab contest={contest} />}
        {tab === "votos" && <LiveVotesTab contest={contest} />}
        {tab === "candidatas" && <CandidatesTab contest={contest} />}
        {tab === "jurados" && <JurorsTab />}
      </main>
    </div>
  );
}

function RankingTab({ contest }: { contest: Contest }) {
  const qc = useQueryClient();
  const rankings = useQuery<RankingRow[]>({
    queryKey: ["rankings", contest],
    queryFn: () => fetchRankings(contest),
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

  const visibleRankings = rankings.data?.filter((r) => {
    const rowContest = (r as any).contest ?? "Embajadora";
    return rowContest === contest;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Concurso</div>
          <div className="font-display text-2xl capitalize">{contest === "Embajadora" ? "Embajadora" : "Chico 10"}</div>
        </div>
      </div>
      <h2 className="mb-4 font-display text-2xl">Ranking en vivo</h2>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Candidato/a</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Promedio</th>
              <th className="px-4 py-2 text-right">Votos</th>
            </tr>
          </thead>
          <tbody>
            {visibleRankings?.map((r, i) => (
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

// Modal de perfil (solo lectura)
function CandidateProfileModal({
  candidate,
  onClose,
}: {
  candidate: Candidate;
  onClose: () => void;
}) {
  const mediaArr: MediaItem[] = Array.isArray(candidate.media)
    ? (candidate.media as unknown as MediaItem[])
    : [];
  const photos = mediaArr.filter((m) => m.type === "photo");
  const videos = mediaArr.filter((m) => m.type === "video");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-y-auto rounded-2xl border bg-card shadow-xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <span className="font-display text-lg">Perfil de candidata</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Foto principal */}
          {candidate.photo_url ? (
            <img
              src={formatImageUrl(candidate.photo_url)}
              alt={candidate.name}
              className="h-48 w-full rounded-xl object-cover"
            />
          ) : (
            <div className="h-48 w-full rounded-xl bg-gradient-jujuy" />
          )}

          {/* Datos */}
          <div>
            <h2 className="font-display text-2xl">{candidate.name}</h2>
            <p className="text-sm text-muted-foreground">
              {candidate.number ? `Nº ${candidate.number}` : ""}
              {candidate.number && candidate.locality ? " · " : ""}
              {candidate.locality ?? ""}
            </p>
          </div>

          {candidate.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{candidate.description}</p>
          )}

          <CandidateDetails candidate={candidate} />

          {/* Galería */}
          {photos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fotos ({photos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={formatImageUrl(p.url)}
                      alt={`foto ${i + 1}`}
                      className="h-24 w-full rounded-lg object-cover transition hover:opacity-80"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Videos ({videos.length})
              </p>
              <div className="space-y-1">
                {videos.map((v, i) => (
                  <a
                    key={i}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate text-muted-foreground">{v.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidatesTab({ contest }: { contest: Contest }) {
  const qc = useQueryClient();
  const candidates = useQuery({
    queryKey: ["candidates", contest],
    queryFn: () => fetchCandidates(contest),
  });

  // Estado para el modal de vista de perfil
  const [viewing, setViewing] = useState<Candidate | null>(null);

  // Estado para el modo de edición
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyMedia = (): MediaItem[] => [
    { type: "photo", url: "" },
    { type: "photo", url: "" },
    // { type: "video", url: "" },
  ];
  const [form, setForm] = useState({
    name: "",
    number: "",
    locality: "",
    description: "",
    curso: "",
    age: "",
    signo: "",
    hobby: "",
    color_preferido: "",
    musica_favorita: "",
    persona_favorita: "",
    mejor_amigo: "",
    libro_preferido: "",
    meta_vida: "",
    mensaje_juventud: "",
    promedio: "",
    contest,
    media: emptyMedia(),
  });

  function loadForEdit(c: Candidate) {
    const mediaArr: MediaItem[] = Array.isArray(c.media) ? (c.media as MediaItem[]) : emptyMedia();
    setEditingId(c.id);
    setForm({
      name: c.name,
      number: c.number != null ? String(c.number) : "",
      locality: c.locality ?? "",
      description: (c as any).description ?? "",
      curso: (c as any).curso ?? "",
      age: (c as any).age != null ? String((c as any).age) : "",
      signo: (c as any).signo ?? "",
      hobby: (c as any).hobby ?? "",
      color_preferido: (c as any).color_preferido ?? "",
      musica_favorita: (c as any).musica_favorita ?? "",
      persona_favorita: (c as any).persona_favorita ?? "",
      mejor_amigo: (c as any).mejor_amigo ?? "",
      libro_preferido: (c as any).libro_preferido ?? "",
      meta_vida: (c as any).meta_vida ?? "",
      mensaje_juventud: (c as any).mensaje_juventud ?? "",
      promedio: (c as any).promedio != null ? String((c as any).promedio) : "",
      contest: (c as any).contest ?? contest,
      media: mediaArr.length > 0 ? mediaArr : emptyMedia(),
    });
    // Scroll al panel del formulario en móvil
    document.getElementById("candidate-form-panel")?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      name: "",
      number: "",
      locality: "",
      description: "",
      curso: "",
      age: "",
      signo: "",
      hobby: "",
      color_preferido: "",
      musica_favorita: "",
      persona_favorita: "",
      mejor_amigo: "",
      libro_preferido: "",
      meta_vida: "",
      mensaje_juventud: "",
      promedio: "",
      contest,
      media: emptyMedia(),
    });
  }

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const media = form.media.filter((m) => m.url.trim().length > 0);
    const photoCount = media.filter((m) => m.type === "photo").length;
    if (media.length < 1) {
      toast.error("Cargá al menos 1 archivo multimedia (foto o video).");
      return;
    }
    const firstPhoto = media.find((m) => m.type === "photo")?.url ?? null;

    if (editingId) {
      // Modo edición: actualizar
      const { error } = await supabase
        .from("candidates")
        .update({
          name: form.name.trim(),
          number: form.number ? Number(form.number) : null,
          locality: form.locality.trim() || null,
          description: form.description.trim() || null,
          curso: form.curso.trim() || null,
          age: form.age ? Number(form.age) : null,
          signo: form.signo.trim() || null,
          hobby: form.hobby.trim() || null,
          color_preferido: form.color_preferido.trim() || null,
          musica_favorita: form.musica_favorita.trim() || null,
          persona_favorita: form.persona_favorita.trim() || null,
          mejor_amigo: form.mejor_amigo.trim() || null,
          libro_preferido: form.libro_preferido.trim() || null,
          meta_vida: form.meta_vida.trim() || null,
          mensaje_juventud: form.mensaje_juventud.trim() || null,
          promedio: form.promedio ? Number(form.promedio) : null,
          contest: form.contest,
          photo_url: firstPhoto,
          media,
        })
        .eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Candidata actualizada.");
      cancelEdit();
    } else {
      // Modo agregar: insertar
      const { error } = await supabase.from("candidates").insert({
        name: form.name.trim(),
        number: form.number ? Number(form.number) : null,
        locality: form.locality.trim() || null,
        description: form.description.trim() || null,
        curso: form.curso.trim() || null,
        age: form.age ? Number(form.age) : null,
        signo: form.signo.trim() || null,
        hobby: form.hobby.trim() || null,
        color_preferido: form.color_preferido.trim() || null,
        musica_favorita: form.musica_favorita.trim() || null,
        persona_favorita: form.persona_favorita.trim() || null,
        mejor_amigo: form.mejor_amigo.trim() || null,
        libro_preferido: form.libro_preferido.trim() || null,
        meta_vida: form.meta_vida.trim() || null,
        mensaje_juventud: form.mensaje_juventud.trim() || null,
        promedio: form.promedio ? Number(form.promedio) : null,
        contest: form.contest,
        photo_url: firstPhoto,
        media,
      });
      if (error) return toast.error(error.message);
      toast.success(
        `Candidata agregada (${photoCount} fotos, ${media.length - photoCount} videos)`,
      );
      setForm({
        name: "",
        number: "",
        locality: "",
        description: "",
        curso: "",
        age: "",
        signo: "",
        hobby: "",
        color_preferido: "",
        musica_favorita: "",
        persona_favorita: "",
        mejor_amigo: "",
        libro_preferido: "",
        meta_vida: "",
        mensaje_juventud: "",
        promedio: "",
        contest,
        media: emptyMedia(),
      });
    }
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["rankings"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar candidata? Se borrarán sus votos.")) return;
    if (editingId === id) cancelEdit();
    const { error } = await supabase.from("candidates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["rankings"] });
  }

  const visibleCandidates = candidates.data?.filter((c) => {
    const candidateContest = (c as any).contest ?? "Embajadora";
    return candidateContest === contest;
  });

  useEffect(() => {
    if (!editingId) {
      setForm((current) => ({ ...current, contest }));
    }
  }, [contest, editingId]);

  return (
    <>
      {/* Modal de perfil */}
      {viewing && <CandidateProfileModal candidate={viewing} onClose={() => setViewing(null)} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Lista */}
        <div>
          <h2 className="mb-4 font-display text-2xl">Candidatas</h2>
          <div className="space-y-2">
            {visibleCandidates?.map((c) => {
              const mediaArr: MediaItem[] = Array.isArray(c.media)
                ? (c.media as unknown as MediaItem[])
                : [];
              const photos = mediaArr.filter((m) => m.type === "photo").length;
              const videos = mediaArr.filter((m) => m.type === "video").length;
              const isEditing = editingId === c.id;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition ${
                    isEditing ? "border-primary ring-1 ring-primary/40" : ""
                  }`}
                >
                  {c.photo_url ? (
                    <img
                      src={formatImageUrl(c.photo_url)}
                      alt={c.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gradient-jujuy" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.number ? `Nº ${c.number}` : ""}
                      {c.number && c.locality ? " · " : ""}
                      {c.locality ?? ""}
                    </div>
                    {c.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
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
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Ver perfil */}
                    <button
                      onClick={() => setViewing(c)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Ver perfil"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {/* Editar */}
                    <button
                      onClick={() => (isEditing ? cancelEdit() : loadForEdit(c))}
                      className={`rounded-lg p-2 transition ${
                        isEditing
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      title={isEditing ? "Cancelar edición" : "Editar"}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {/* Eliminar */}
                    <button
                      onClick={() => remove(c.id)}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {(!visibleCandidates || visibleCandidates.length === 0) && (
              <p className="text-sm text-muted-foreground">
                Aún no hay candidatos/as cargados para este concurso.
              </p>
            )}
          </div>
        </div>

        {/* Formulario agregar / editar */}
        <form
          id="candidate-form-panel"
          onSubmit={save}
          className="h-fit space-y-3 rounded-2xl border bg-card p-5 shadow-soft"
        >
          {/* Header del panel */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">
              {editingId ? "Editar candidato/a" : "Agregar candidato/a"}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-3 w-3" /> Cancelar
              </button>
            )}
          </div>

          {editingId && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
              Editando un perfil existente. Los cambios se guardarán al hacer clic en "Guardar
              cambios".
            </p>
          )}

          <input
            placeholder="NOMBRE Y APELLIDO"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="CANDIDATA N°"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="CURSO AL QUE REPRESENTA"
              value={form.curso}
              onChange={(e) => setForm({ ...form, curso: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="EDAD"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="SIGNO"
              value={form.signo}
              onChange={(e) => setForm({ ...form, signo: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="PROMEDIO"
              value={form.promedio}
              onChange={(e) => setForm({ ...form, promedio: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="HOBBY"
              value={form.hobby}
              onChange={(e) => setForm({ ...form, hobby: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="COLOR PREFERIDO"
              value={form.color_preferido}
              onChange={(e) => setForm({ ...form, color_preferido: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="MÚSICA FAVORITA"
              value={form.musica_favorita}
              onChange={(e) => setForm({ ...form, musica_favorita: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="MI PERSONA FAVORITA"
              value={form.persona_favorita}
              onChange={(e) => setForm({ ...form, persona_favorita: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="MI MEJOR AMIGO/A"
              value={form.mejor_amigo}
              onChange={(e) => setForm({ ...form, mejor_amigo: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="LIBRO PREFERIDO"
              value={form.libro_preferido}
              onChange={(e) => setForm({ ...form, libro_preferido: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <input
            placeholder="META EN LA VIDA"
            value={form.meta_vida}
            onChange={(e) => setForm({ ...form, meta_vida: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="MENSAJE PARA LA JUVENTUD"
            value={form.mensaje_juventud}
            onChange={(e) => setForm({ ...form, mensaje_juventud: e.target.value })}
            className="h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Multimedia (mín. 1)
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
                    {/* <option value="video">Video</option> */}
                  </select>
                  <input
                    placeholder={
                      m.type === "photo" ? "URL o enlace de Google Drive de la foto" : "YouTube / Vimeo / Google Drive / .mp4"
                    }
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
              {/* <button
                type="button"
                onClick={() => addItem("video")}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Film className="h-3 w-3" /> Video
              </button> */}
            </div>
          </div>

          {editingId ? (
            <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow">
              <Pencil className="h-4 w-4" /> Guardar cambios
            </button>
          ) : (
            <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-semibold text-gold-foreground shadow-gold">
              <Plus className="h-4 w-4" /> Agregar candidato/a
            </button>
          )}
        </form>
      </div>
    </>
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

function LiveVotesTab({ contest }: { contest: Contest }) {
  const qc = useQueryClient();
  const candidates = useQuery({
    queryKey: ["candidates", contest],
    queryFn: () => fetchCandidates(contest),
  });
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

  const fixedLabels = [
    "Exposición oral",
    "Actitud pasarela",
    "Compromiso escolar",
    "Compañerismo",
    "Debate",
    "Notas",
  ];
  const cats = (categories.data ?? []).map((cat, i) => ({
    ...cat,
    displayName: fixedLabels[i] ?? cat.name,
  }));
  const cands = (candidates.data ?? []).filter((c) => {
    const candidateContest = (c as any).contest ?? "Embajadora";
    return candidateContest === contest;
  });
  const jur = jurors.data ?? [];
  const candidateIds = new Set(cands.map((c) => c.id));
  const contestVotes = (votes.data ?? []).filter((v) => candidateIds.has(v.candidate_id));
  const map = new Map<string, number>();
  contestVotes.forEach((v) =>
    map.set(`${v.juror_id}:${v.candidate_id}:${v.category_id}`, v.score),
  );

  const totalEsperado = jur.length * cands.length * cats.length;
  const emitidos = contestVotes.length;
  const pct = totalEsperado ? Math.round((emitidos / totalEsperado) * 100) : 0;

  const downloadVotesPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const goldColor = "#D4AF37";
    const darkColor = "#1C232B";
    const now = new Date();
    const dateStr = now.toLocaleDateString("es-AR");
    const timeStr = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    doc.setFillColor(28, 35, 43);
    doc.rect(0, 0, pageWidth, 50, "F");

    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("Comprobante Oficial de Votación", margin + 15, 20);

    const contestLabel = contest === "Embajadora" ? "Embajadora" : "Chico 10";

    doc.setFontSize(11);
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Elección ${contestLabel} Colegio Polimodal N°8  · Emitido: ${dateStr}, ${timeStr}`, margin + 15, 30);

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Comprobante oficial de votación", margin + 15, 40);

    let y = 60;

    doc.setTextColor(28, 35, 43);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Ranking final", margin, y);
    y += 8;

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    const colWidths = [15, 50, 12, 25, 25, 20];
    const colHeaders = ["#", "Candidat@", "Nº", "Total", "Promedio", "Votos"];
    const headerHeight = 10;

    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y - 6, pageWidth - margin * 2, headerHeight, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    let xPos = margin + 2;
    colHeaders.forEach((header, i) => {
      doc.text(header, xPos, y + 2);
      xPos += colWidths[i];
    });

    y += 10;

    const rankedCands = cands.map((c, idx) => {
      const scores = jur.flatMap((j) =>
        cats
          .map((cat) => map.get(`${j.id}:${c.id}:${cat.id}`))
          .filter((s): s is number => typeof s === "number"),
      );
      const total = scores.reduce((a, b) => a + b, 0);
      const avg = scores.length > 0 ? (total / scores.length).toFixed(2) : "0.00";
      const numVotos = scores.length;
      return { ...c, total, avg, numVotos, rank: idx + 1 };
    });

    rankedCands.sort((a, b) => b.total - a.total);

    doc.setTextColor(28, 35, 43);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    rankedCands.forEach((cand, idx) => {
      const rowHeight = 8;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, y + rowHeight - 1, pageWidth - margin, y + rowHeight - 1);

      xPos = margin + 2;
      doc.text(String(idx + 1), xPos, y + 4);
      xPos += colWidths[0];

      const candLabel = cand.number ? `Nº ${cand.number} · ${cand.name}` : cand.name;
      doc.text(candLabel.substring(0, 20), xPos, y + 4);
      xPos += colWidths[1];

      doc.text(cand.number ? String(cand.number) : "—", xPos, y + 4);
      xPos += colWidths[2];

      doc.setFont("helvetica", "bold");
      doc.text(String(cand.total), xPos, y + 4);
      xPos += colWidths[3];

      doc.setFont("helvetica", "normal");
      doc.text(String(cand.avg), xPos, y + 4);
      xPos += colWidths[4];

      doc.text(String(cand.numVotos), xPos, y + 4);

      y += rowHeight;
    });

    y = pageHeight - 70;

    const sealSize = 35;
    const sealX = pageWidth - margin - sealSize / 2;
    const sealY = y + 10;

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(2);
    doc.circle(sealX, sealY, sealSize / 2, "S");

    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RESULTADO", sealX, sealY - 5, { align: "center" });
    doc.text("FINAL", sealX, sealY, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(dateStr, sealX, sealY + 6, { align: "center" });
    doc.text(timeStr + " p.m. hs", sealX, sealY + 11, { align: "center" });

    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Elección ${contestLabel} de Jujuy · Resultado final ${dateStr}, ${timeStr}`,
      margin,
      pageHeight - 8,
    );
    doc.text("Página 1 de 1", pageWidth - margin - 20, pageHeight - 8);

    doc.save(`comprobante-votos-${dateStr.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Concurso</div>
          <div className="font-display text-2xl capitalize">
            {contest === "Embajadora" ? "Embajadora" : "Chico 10"}
          </div>
          <p className="text-sm text-muted-foreground">
            Puntajes de cada jurado, actualizados en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadVotesPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Descargar PDF
          </button>
          <div className="rounded-xl border bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground">Progreso: </span>
            <span className="font-display text-gold">
              {emitidos}/{totalEsperado}
            </span>
            <span className="text-muted-foreground"> ({pct}%)</span>
          </div>
        </div>
      </div>
      {jur.length === 0 || cands.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Necesitás al menos un candidata/o y un jurado.
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
                          {cat.displayName}
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
