import type { Database } from "@/integrations/supabase/types";

type CandidateRow = Database["public"]["Tables"]["candidates"]["Row"];

export function CandidateDetails({ candidate }: { candidate: CandidateRow | any }) {
  if (!candidate) return null;
  const c = candidate as any;

  const fields = [
    { label: "Curso", value: c.curso },
    { label: "Edad", value: c.age ? `${c.age} años` : null },
    { label: "Signo", value: c.signo },
    { label: "Hobby", value: c.hobby },
    { label: "Color preferido", value: c.color_preferido },
    { label: "Música favorita", value: c.musica_favorita },
    { label: "Persona favorita", value: c.persona_favorita },
    { label: "Mejor amigo/a", value: c.mejor_amigo },
    { label: "Libro preferido", value: c.libro_preferido },
    { label: "Meta en la vida", value: c.meta_vida },
  ].filter((f) => f.value != null && String(f.value).trim() !== "");

  if (fields.length === 0 && !c.mensaje_juventud) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-gold"></span>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gold">Ficha de la Candidata</h4>
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {fields.map((f, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 shadow-xs">
              <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {f.label}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground truncate block">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {c.mensaje_juventud && (
        <div className="rounded-lg border border-border/60 bg-background/80 p-3 shadow-xs">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Mensaje para la Juventud
          </span>
          <p className="mt-1 text-xs sm:text-sm italic leading-relaxed text-foreground">
            "{c.mensaje_juventud}"
          </p>
        </div>
      )}
    </div>
  );
}
