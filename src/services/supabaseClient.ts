import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../config/supabase";

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.publishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
