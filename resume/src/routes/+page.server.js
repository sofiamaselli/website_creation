import { supabase } from "$lib/supabaseClient";

export async function load() {
  const { data } = await supabase.from("testimonials_contacts").select();
  return {
    testimonials_contacts: data ?? [],
  };
}