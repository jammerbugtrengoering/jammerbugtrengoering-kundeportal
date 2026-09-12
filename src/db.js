import { createClient } from "@supabase/supabase-js";

// Den offentlige nøgle må gerne ligge her — den er beregnet på at stå i en browser og
// giver i sig selv ingen adgang. Alt hvad kunden kan nå, er afgrænset i databasen med
// current_portal_guid(), som læser hendes login og ikke noget hun selv kan sende med.
// Ændres den afgrænsning nogensinde, er det DER hullet opstår, ikke her.
//
// 12.9.2026: nøglen læses nu FØRST fra miljøet, med værdien herunder som reserve.
//
// Der stod en VITE_SUPABASE_PUBLISHABLE_KEY i Netlify på portalen, og den gjorde
// ingenting — koden læste den ikke. Det er den slags, der bider en dag nogen skifter
// nøglen: man retter den på alle tre sites, de to følger med, og portalen bliver ved
// med den gamle uden at sige noget. Portalen er kundernes indgang, så det er den, der
// må vente længst på at nogen opdager det.
//
// Reserven bliver stående, så portalen også virker for en, der lige har klonet repoet
// og ikke har sat noget op. Nøglen er offentlig; der er intet at beskytte ved at
// fjerne den herfra.
const URL = "https://gteowfoahsfpunzgdxum.supabase.co";
const NOEGLE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "sb_publishable_GF49Zf5gHAm_nlNff-PuTA_4Cf8L-1e";

export const db = createClient(URL, NOEGLE, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Linket i mailen bærer sessionen i adressen. Uden det her ville kunden lande på
    // login-siden igen, selvom hun lige har trykket på linket.
    detectSessionInUrl: true,
    // Implicit, ikke PKCE. Linket bliver dannet på serveren i portal-login, og der
    // findes derfor ingen code_verifier i browseren at bytte en kode med. PKCE ville
    // se rigtigt ud lige indtil kunden trykkede på linket.
    flowType: "implicit",
  },
});

export const FUNKTIONER = `${URL}/functions/v1`;

// Kald til en funktion der IKKE kræver login. Bruges kun til at bede om et
// engangslink — alt andet går gennem den logede klient.
export async function kaldAaben(navn, krop) {
  const res = await fetch(`${FUNKTIONER}/${navn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: NOEGLE },
    body: JSON.stringify(krop),
  });
  return await res.json().catch(() => ({}));
}
