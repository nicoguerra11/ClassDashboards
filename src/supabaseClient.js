import { createClient } from '@supabase/supabase-js'

// Cliente normal para usuarios (con anon key)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Cliente admin para funciones administrativas (con service role key)
// ⚠️ IMPORTANTE: Solo usar en funciones protegidas con contraseña de admin
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)