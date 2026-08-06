import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Crown, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchCandidates, fetchRankings } from "@/lib/public-data";
import { MediaGallery, type MediaItem } from "@/components/media-gallery";
import heroImg from "@/assets/jujuy-hero.jpg";
import geekStoreLogo from "@/assets/GEEK STORE LOGO-bB5kTN19.png";
import { usePageTitle } from "@/hooks/use-page-title";
import { formatImageUrl } from "@/lib/utils";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type RankingRow = Database["public"]["Views"]["candidate_rankings"]["Row"];

export default function HomePage() {
  usePageTitle("Elección Embajadora de Jujuy — Votación oficial");
  const qc = useQueryClient();
  const [contest, setContest] = useState<"Embajadora" | "chico10">("Embajadora");
  const candidates = useQuery<Candidate[]>({
    queryKey: ["candidates", contest],
    queryFn: () => fetchCandidates(contest),
  });
  const rankings = useQuery<RankingRow[]>({
    queryKey: ["rankings", contest],
    queryFn: () => fetchRankings(contest),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("public-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        qc.invalidateQueries({ queryKey: ["rankings"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, () => {
        qc.invalidateQueries({ queryKey: ["candidates"] });
        qc.invalidateQueries({ queryKey: ["rankings"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-white">
            <Crown className="h-6 w-6 text-gold" />
            {/* <span className="font-display text-lg font-bold">Jujuy</span> */}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/jurado"
              className="rounded-full bg-white/10 backdrop-blur px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/20"
            >
              Soy jurado
            </Link>
            <Link
              to="/auth"
              className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground hover:opacity-90"
            >
              Admin
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Cerros de Jujuy"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-background" />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-40 sm:pt-48 sm:pb-28">
          <div className="max-w-3xl text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-gold/30 text-gold">
              Edición 2026 · Jujuy, Argentina
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl">
              Elección{" "}
              <span className="text-gradient-gold">Representante - Embajadora y Chico 10 </span>
              Colegio Polimodal N°8
              <span className="text-gradient-gold"> "Juana Azurduy"</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Conocé a las candidatas, seguí las puntuaciones del jurado y viví la elección en
              tiempo real.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" /> En vivo
            </div>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl">Ranking del jurado</h2>
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

        {rankings.isLoading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : rankings.data && rankings.data.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            <table className="w-full">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Candidata</th>
                  <th className="px-4 py-3 text-right">Puntaje</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Promedio</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Votos</th>
                </tr>
              </thead>
              <tbody>
                {rankings.data.map((r, i: number) => (
                  <tr key={r.candidate_id} className="border-t">
                    <td className="px-4 py-3 font-display text-lg">
                      {i === 0 ? <Crown className="h-5 w-5 text-gold" /> : i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.photo_url ? (
                          <img
                            src={formatImageUrl(r.photo_url)}
                            alt={r.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-jujuy" />
                        )}
                        <div>
                          <div className="font-medium">{r.name}</div>
                          {r.locality && (
                            <div className="text-xs text-muted-foreground">{r.locality}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-display text-xl">{r.total_score}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                      {Number(r.average_score).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                      {r.votes_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">Aún no hay candidatas cargadas.</p>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <h2 className="mb-8 font-display text-3xl sm:text-4xl">Candidatas</h2>
        {candidates.data && candidates.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.data.map((c) => (
              <article
                key={c.id}
                className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-gold"
              >
                <div className="mx-auto h-[400px] w-full max-w-[400px] overflow-hidden rounded-t-2xl bg-black sm:rounded-tr-2xl sm:rounded-t-none">
                  <div className="h-full w-full">
                    <MediaGallery
                      media={(c.media as MediaItem[]) ?? []}
                      fallbackPhoto={c.photo_url}
                      alt={c.name}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    {c.number && (
                      <div className="text-xs font-semibold text-gold">Nº {c.number}</div>
                    )}
                    <div className="font-display text-xl">{c.name}</div>
                    {c.locality && (
                      <div className="text-sm text-muted-foreground">{c.locality}</div>
                    )}
                    {c.description ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-3">
                        {c.description}
                      </p>
                    ) : null}
                  </div>
                  <Crown className="h-5 w-5 text-gold/40 transition group-hover:text-gold" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Las candidatas se anunciarán pronto.</p>
        )}
      </section>

      <footer className="border-t bg-muted/40 py-8 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
            <img
              src={geekStoreLogo}
              alt="Geek Store logo"
              className="h-14 w-auto rounded-md object-contain"
            />
            <span className="font-semibold text-foreground">Geek Store</span>
          </div>
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
            <span className="font-medium text-foreground">Soporte técnico:</span>
            <a href="mailto:geekstoretech@gmail.com" className="text-primary hover:underline">
              geekstoretech@gmail.com
            </a>
          </div>
          <span className="font-medium text-foreground">© 2026 GEEK STORE "Creative Tech Solutions"</span>
        </div>
      </footer>
    </div>
  );
}
