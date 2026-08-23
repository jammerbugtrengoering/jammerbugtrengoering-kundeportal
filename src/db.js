import { createClient } from "@supabase/supabase-js";

// Den offentlige nøgle må gerne ligge her — den er beregnet på at stå i en browser og
// giver i sig selv ingen adgang. Alt hvad kunden kan nå, er afgrænset i databasen med
// current_portal_guid(), som læser hendes login og ikke noget hun selv kan sende med.
// Ændres den afgrænsning nogensinde, er det DER hullet opstår, ikke her.
const URL = "https://gteowfoahsfpunzgdxum.supabase.co";
const NOEGLE = "sb_publishable_GF49Zf5gHAm_nlNff-PuTA_4Cf8L-1e";

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
