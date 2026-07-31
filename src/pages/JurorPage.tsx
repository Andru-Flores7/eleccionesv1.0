import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, LogOut } from "lucide-react";
import { fetchCandidates, fetchCategories } from "@/lib/public-data";
import type { Database } from "@/integrations/supabase/types";
import { verifyJurorCode, getJurorVotes, castVote } from "@/lib/voting";
import { MediaGallery, type MediaItem } from "@/components/media-gallery";
import { usePageTitle } from "@/hooks/use-page-title";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type VoteRow = { candidate_id: string; category_id: string; score: number };

export default function JurorPage() {
  usePageTitle("Jurado — Votación Reina de Jujuy");
  const [code, setCode] = useState<string | null>(null);
  const [juror, setJuror] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("juror_code");
    if (saved) {
      verifyStored(saved.toUpperCase());
    }
  }, []);

  async function verifyStored(c: string) {
    try {
      const juror = await verifyJurorCode(c);
      if (juror) {
        setCode(c);
        setJuror(juror);
      } else {
        localStorage.removeItem("juror_code");
      }
    } catch {
      localStorage.removeItem("juror_code");
    }
  }

  async function onSubmitCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = (new FormData(e.currentTarget).get("code") as string).trim().toUpperCase();
    try {
      const juror = await verifyJurorCode(value);
      if (!juror) {
        toast.error("Código inválido");
        return;
      }
      localStorage.setItem("juror_code", value);
      setCode(value);
      setJuror(juror);
    } catch {
      toast.error("Código inválido");
    }
  }

  function logout() {
    localStorage.removeItem("juror_code");
    setCode(null);
    setJuror(null);
  }

  if (!code || !juror) {
    return (
      <div className="min-h-screen bg-gradient-jujuy flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-soft">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver
          </Link>
          <div className="mb-6 flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl">Acceso jurado</h1>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Ingresá el código de acceso que te entregó la organización.
          </p>
          <form onSubmit={onSubmitCode} className="space-y-4">
            <input
              name="code"
              required
              placeholder="Ej: JUJ-2026-XXXX"
              autoComplete="off"
              className="w-full rounded-lg border bg-background px-3 py-3 text-center font-mono text-sm uppercase tracking-widest"
            />
            <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <VotingPanel code={code} juror={juror} onLogout={logout} />;
}

function VotingPanel({
  code,
  juror,
  onLogout,
}: {
  code: string;
  juror: { id: string; name: string };
  onLogout: () => void;
}) {
  const qc = useQueryClient();
  const candidates = useQuery<Candidate[]>({ queryKey: ["candidates"], queryFn: fetchCandidates });
  const categories = useQuery<Category[]>({ queryKey: ["categories"], queryFn: fetchCategories });

  const categoryNameMap: Record<string, string> = {
    'Desenvoltura': 'Desenvoltura',
    'Simpatía': 'Simpatía',
    'Elegancia': 'Elegancia',
    'Personalidad': 'Personalidad',
    'Simpatía y carisma': 'Simpatía',
    'Elegancia y postura': 'Elegancia',
    'Desenvolvimiento': 'Desenvoltura',
    'Oratoria y Entrevista': 'Personalidad',
    'Presencia Escénica': 'Personalidad',
  };
  const myVotes = useQuery<VoteRow[]>({
    queryKey: ["juror-votes", code],
    queryFn: async () => await getJurorVotes(code),
  });

  const voteMap = new Map<string, number>();
  (myVotes.data ?? []).forEach((v) => voteMap.set(`${v.candidate_id}:${v.category_id}`, v.score));

  async function setScore(candidate_id: string, category_id: string, score: number) {
    try {
      await castVote(code, candidate_id, category_id, score);
      qc.setQueryData<VoteRow[]>(["juror-votes", code], (old = []) => {
        const others = old.filter(
          (v) => !(v.candidate_id === candidate_id && v.category_id === category_id),
        );
        return [...others, { candidate_id, category_id, score }];
      });
      qc.invalidateQueries({ queryKey: ["rankings"] });
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message ?? "Error");
      } else {
        toast.error("Error desconocido");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Jurado</div>
              <div className="font-medium leading-tight">{juror.name}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Tu voto</h1>
          <p className="text-sm text-muted-foreground">
            Puntuá cada candidata del 1 al 10 en cada categoría. Se guarda automáticamente.
          </p>
          <div className="mt-6 rounded-3xl border border-gray-200/70 bg-muted p-4 text-sm text-foreground/90 shadow-sm sm:text-base">
            <p className="font-semibold">¿Qué evalúa el jurado?</p>
            <p className="mt-2">
              El jurado puntúa a las candidatas según una entrevista integral o coloquio y sus
              pasadas en los desfiles. Evalúan principalmente:
            </p>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Desenvoltura</li>
              <li>Simpatía</li>
              <li>Elegancia</li>
              <li>Personalidad</li>
            </ul>
          </div>
        </div>

        {candidates.data?.map((c) => (
          <article key={c.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            <div className="grid gap-4 sm:grid-cols-[300px_1fr]">
              <div className="mx-auto h-[300px] w-full max-w-[300px] sm:mx-0 sm:h-[300px] sm:w-[300px]">
                <div className="h-full w-full overflow-hidden rounded-2xl bg-black">
                  <MediaGallery
                    media={(c.media as MediaItem[]) ?? []}
                    fallbackPhoto={c.photo_url}
                    alt={c.name}
                  />
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="mb-4">
                  {c.number && <div className="text-xs font-semibold text-gold">Nº {c.number}</div>}
                  <div className="font-display text-2xl">{c.name}</div>
                  {c.locality && <div className="text-xs text-muted-foreground">{c.locality}</div>}
                </div>
                <div className="space-y-4">
                  {categories.data?.map((cat) => {
                    const key = `${c.id}:${cat.id}`;
                    const current = voteMap.get(key);
                    return (
                      <div key={cat.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {categoryNameMap[cat.name] ?? cat.name}
                          </span>
                          <span className="text-sm text-gold">{current ?? "—"}/10</span>
                        </div>
                        <div className="grid grid-cols-10 gap-1">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScore(c.id, cat.id, n)}
                              className={`aspect-square rounded-md text-xs font-semibold transition ${
                                current === n
                                  ? "bg-gradient-gold text-gold-foreground shadow-gold"
                                  : "bg-muted text-muted-foreground hover:bg-gold/20 hover:text-gold"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
