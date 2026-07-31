import { supabase } from "@/integrations/supabase/client";

export async function verifyJurorCode(code: string) {
  const { data, error } = await supabase
    .from("jurors")
    .select("id, name")
    .eq("access_code", code)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getJurorVotes(code: string) {
  const { data: juror, error: jurorError } = await supabase
    .from("jurors")
    .select("id")
    .eq("access_code", code)
    .maybeSingle();

  if (jurorError) throw jurorError;
  if (!juror) throw new Error("Código inválido");

  const { data, error } = await supabase
    .from("votes")
    .select("candidate_id, category_id, score")
    .eq("juror_id", juror.id);

  if (error) throw error;
  return data ?? [];
}

export async function castVote(
  code: string,
  candidate_id: string,
  category_id: string,
  score: number,
) {
  const { data: juror, error: jurorError } = await supabase
    .from("jurors")
    .select("id")
    .eq("access_code", code)
    .maybeSingle();

  if (jurorError) throw jurorError;
  if (!juror) throw new Error("Código inválido");

  const { error } = await supabase.from("votes").upsert(
    {
      juror_id: juror.id,
      candidate_id,
      category_id,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: ["juror_id", "candidate_id", "category_id"] },
  );

  if (error) throw error;
  return { ok: true };
}
