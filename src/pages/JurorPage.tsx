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
  usePageTitle("Jurado — Votación Embajadora de Jujuy");
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
  const [contest, setContest] = useState<"Embajadora" | "chico10">("Embajadora");
  const candidates = useQuery<Candidate[]>({
    queryKey: ["candidates", contest],
    queryFn: () => fetchCandidates(contest),
  });
  const categories = useQuery<Category[]>({ queryKey: ["categories"], queryFn: fetchCategories });

  const fixedLabels = [
    "Exposición oral",
    "Actitud pasarela",
    "Compromiso escolar",
    "Compañerismo",
    "Debate",
    "Notas",
  ];
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Concurso</div>
            <div className="font-display text-2xl capitalize">{contest === "Embajadora" ? "Embajadora" : "Chico 10"}</div>
          </div>
          <div className="flex gap-2">
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
        </div>
        {candidates.data?.map((c) => (
          <article key={c.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            <div className="grid gap-6 lg:grid-cols-[600px_1fr] lg:items-center">
              <div className="mx-auto h-[600px] w-full max-w-[600px] lg:mx-0 lg:h-[600px] lg:w-[600px]">
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
                  <div className="font-display text-2xl sm:text-3xl font-bold text-gradient-gold">{c.name}</div>
                  {c.locality && <div className="text-xs text-muted-foreground">{c.locality}</div>}
                </div>
                <div className="space-y-4">
                  {(() => {
                    const visible = (categories.data ?? []).map((cat, i) => ({
                      ...cat,
                      displayName: fixedLabels[i] ?? cat.name,
                    }));
                    return visible.map((cat) => {
                      const key = `${c.id}:${cat.id}`;
                      const current = voteMap.get(key);
                      return (
                        <div key={cat.id}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-base sm:text-lg font-bold">{cat.displayName}</span>
                            <span className="text-base sm:text-lg font-bold text-gold">{current ?? "—"}/10</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setScore(c.id, cat.id, n)}
                                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-sm sm:text-base font-bold transition-all ${
                                  current === n
                                    ? "bg-primary text-gold-foreground shadow-gold scale-105 ring-2 ring-gold"
                                    : "bg-muted text-muted-foreground hover:bg-gold/20 hover:text-gold"
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
