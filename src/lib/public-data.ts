import { supabase } from "@/integrations/supabase/client";

export type MediaItem = { type: "photo" | "video"; url: string };

export async function fetchCandidates(contest?: string) {
  let query = supabase.from("candidates").select("*").order("number", {
    ascending: true,
    nullsFirst: false,
  });

  if (contest) {
    query = query.eq("contest", contest);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRankings(contest?: string) {
  let query = supabase.from("candidate_rankings").select("*").order("total_score", {
    ascending: false,
  });

  if (contest) {
    query = query.eq("contest", contest);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
