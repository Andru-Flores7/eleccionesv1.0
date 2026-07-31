import { supabase } from "@/integrations/supabase/client";

export type MediaItem = { type: "photo" | "video"; url: string };

export async function fetchCandidates() {
  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, number, locality, photo_url, description, media")
    .order("number", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRankings() {
  const { data, error } = await supabase
    .from("candidate_rankings")
    .select("*")
    .order("total_score", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
