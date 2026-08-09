import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Testimonial = {
  id: string;
  author_name: string;
  author_title: string | null;
  quote: string;
};

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("testimonials")
    .select("id, author_name, author_title, quote")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  return data ?? [];
});
