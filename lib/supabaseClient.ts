import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// DEDEKTİF KODU: Tarayıcı konsoluna şifrenin ilk 15 harfini yazdır
console.log("Supabase URL OKUNUYOR MU?:", supabaseUrl);
console.log("Supabase ŞİFRE OKUNUYOR MU?:", supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + "..." : "ŞİFRE BULUNAMADI (UNDEFINED)!");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);