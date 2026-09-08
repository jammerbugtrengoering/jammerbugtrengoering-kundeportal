import { useCallback, useEffect, useState } from "react";
import { db, kaldAaben } from "./db.js";
import { F, kr, datoKort, tid } from "./stil.js";

// Kundens egen side: hendes opgaver, hendes fakturaer, hendes kolleger.
//
// Alt hvad der vises her, er afgrænset i databasen — ikke i skærmbilledet. Kunden
// kan ikke se en anden kundes data ved at ændre noget i browseren, fordi hverken
// portal_opgaver eller Dinero-funktionen tager imod et kunde-id udefra: begge slår
// det op ud fra hvem der er logget ind.

const STATUS_TEKST = {
  udført: { tekst: "Udført", farve: "#166534", bag: "#F0FDF4" },
  planlagt: { tekst: "Planlagt", farve: "#1E40AF", bag: "#EFF6FF" },
  unscheduled: { tekst: "Ikke planlagt endnu", farve: "#64748B", bag: "#F8FAFC" },
  aflyst: { tekst: "Aflyst", farve: "#B91C1C", bag: "#FEF2F2" },
};

const FAKTURA_STATUS = {
  Draft: { tekst: "Kladde", farve: "#64748B" },
  Booked: { tekst: "Afventer betaling", farve: "#B45309" },
  Paid: { tekst: "Betalt", farve: "#166534" },
  Overdue: { tekst: "Forfalden", farve: "#B91C1C" },
  Overpaid: { tekst: "Overbetalt", farve: "#166534" },
  Deleted: { tekst: "Annulleret", farve: "#94A3B8" },
};

// Dinero sætter et kladdenummer der er større end det JavaScript kan tælle til.
// Uden det her ville kunden se "#9223372036854776000" stå på sin faktura.
function fakturaNummer(f) {
  if (f.Status === "Draft") return "Kladde";
  const n = Number(f.Number);
  if (!Number.isFinite(n) || n <= 0 || n > Number.MAX_SAFE_INTEGER) return "Kladde";
  return `#${n}`;
}

// ── Login ────────────────────────────────────────────────────────
//
// Kunden faar en kode, ikke et link. Laengden staar ingen steder i koden her -
// Supabase-projektet sender otte cifre, men det er en indstilling, saa feltet tager
// imod 6-10 og lader Supabase afgoere om den passer.
//
// Der STOD et link her. Det virkede for alle med gmail og fejlede for alle med
// firmamail, og auth-loggen viste hvorfor: linket blev indloest et minut efter
// afsendelse, foer kunden havde mailen. Microsoft Defender scanner links ved at hente
// dem, og et GET paa /auth/v1/verify ER selve login'et - saa scanneren brugte
// engangstokenet op, og kunden endte tilbage paa denne side. Igen og igen.
//
// En kode kan ikke hentes. Den skal skrives af.
function LogInd({ forside, slug }) {
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [sendt, setSendt] = useState(false);
  const [sender, setSender] = useState(false);
  const [tjekker, setTjekker] = useState(false);
  const [fejl, setFejl] = useState("");

  async function send() {
    if (!email.includes("@")) return;
    setSender(true); setFejl("");
    await kaldAaben("portal-login", { email: email.trim(), slug });
    setSender(false);
    // Kvitteringen er den samme uanset om mailen findes. Sagde vi "den kender vi
    // ikke", kunne enhver bruge siden til at finde ud af hvem der er kunde hos os.
    setSendt(true);
  }

  async function bekraeft() {
    const t = kode.replace(/\D/g, "");
    if (t.length < 6) return;
    setTjekker(true); setFejl("");
    const { error } = await db.auth.verifyOtp({ email: email.trim(), token: t, type: "email" });
    setTjekker(false);
    // Lykkes det, opdager onAuthStateChange det selv og siden skifter. Her er der
    // kun noget at goere hvis det gik galt.
    if (error) { setFejl("Koden passer ikke, eller den er udløbet."); setKode(""); }
  }

  if (sendt) {
    return (
      <div style={F.kort}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Tjek din mail</div>
        <div style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>
          Er <strong>{email}</strong> registreret som bruger her, ligger der nu en
          kode til dig. Skriv den herunder — den står øverst i mailen.
        </div>
        <input style={{ ...F.felt, fontSize: 24, letterSpacing: 5, textAlign: "center",
                        fontFamily: "monospace" }}
          value={kode} inputMode="numeric" autoComplete="one-time-code" maxLength={10}
          placeholder="00000000" autoFocus
          onChange={(e) => setKode(e.target.value.replace(/\D/g, "").slice(0, 10))}
          onKeyDown={(e) => e.key === "Enter" && bekraeft()} />
        {fejl && <div style={{ ...F.hint, color: "#B91C1C", marginTop: 8 }}>{fejl}</div>}
        <button style={{ ...F.knap, marginTop: 14, opacity: tjekker ? 0.6 : 1 }}
          onClick={bekraeft} disabled={tjekker || kode.length < 6}>
          {tjekker ? "Et øjeblik…" : "Log ind"}
        </button>
        <button style={{ ...F.knap2, marginTop: 8 }}
          onClick={() => { setSendt(false); setKode(""); setFejl(""); }}>
          Brug en anden mail
        </button>
      </div>
    );
  }

  return (
    <div style={F.kort}>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
        {forside?.visningsnavn ? `Log ind — ${forside.visningsnavn}` : "Log ind"}
      </div>
      <div style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>
        Skriv din mail, så sender vi en kode du kan logge ind med. Der er ingen
        adgangskode at huske.
      </div>
      <input style={F.felt} type="email" value={email} inputMode="email" autoComplete="email"
        placeholder="navn@virksomhed.dk"
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()} />
      <button style={{ ...F.knap, marginTop: 14, opacity: sender ? 0.6 : 1 }}
        onClick={send} disabled={sender || !email.includes("@")}>
        {sender ? "Sender…" : "Send mig en kode"}
      </button>
      <div style={F.hint}>
        Kan du ikke komme ind? Ring til kontoret, så opretter vi dig.
      </div>
    </div>
  );
}

// ── Opgaver ──────────────────────────────────────────────────────────────────
function Opgave({ o }) {
  const [aaben, setAaben] = useState(false);
  const s = STATUS_TEKST[o.status] || STATUS_TEKST.planlagt;
  const punkter = Array.isArray(o.tjekliste) ? o.tjekliste : [];
  const udfoerte = punkter.filter((p) => p.udfoert).length;

  return (
    <div style={{ borderBottom: "1px solid #F1F5F9", padding: "12px 0" }}>
      <div onClick={() => setAaben(!aaben)} style={{ cursor: "pointer", minHeight: 44 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{o.titel}</div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                         background: s.bag, color: s.farve, whiteSpace: "nowrap", height: "fit-content" }}>
            {s.tekst}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
          {datoKort(o.dato)}
          {/* slice(0,5): feltet er en tid med sekunder, saa der stod "kl. 13:00:00".
              Ingen aftaler et besoeg paa sekundet. */}
          {o.tidspunkt ? ` · kl. ${String(o.tidspunkt).slice(0, 5)}` : ""}
          {o.status === "udført" && o.registreret_minutter > 0 ? ` · ${tid(o.registreret_minutter)}` : ""}
          {punkter.length > 0 ? ` · ${udfoerte} af ${punkter.length} punkter` : ""}
        </div>
      </div>

      {aaben && (
        <div style={{ marginTop: 10, paddingLeft: 2 }}>
          {o.adresse && <div style={{ fontSize: 13.5, color: "#475569" }}>{o.adresse}</div>}
          {o.reference && (
            <div style={{ fontSize: 13.5, color: "#475569", marginTop: 2 }}>
              Reference: {o.reference}
            </div>
          )}
          {o.status === "udført" && o.udfoert_af && (
            <div style={{ fontSize: 13.5, color: "#475569", marginTop: 2 }}>
              Udført af {o.udfoert_af}
            </div>
          )}
          {punkter.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {punkter.map((p, i) => (
                <div key={i} style={{ fontSize: 13.5, lineHeight: 1.7,
                                      color: p.udfoert ? "#166534" : "#94A3B8" }}>
                  {p.udfoert ? "✓" : "○"} {p.tekst}
                </div>
              ))}
              {o.status !== "udført" && (
                <div style={{ ...F.hint, marginTop: 6 }}>
                  Punkterne bliver sat af som de udføres.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Opgaver() {
  const [opgaver, setOpgaver] = useState(null);
  const [fejl, setFejl] = useState("");
  const [visTidligere, setVisTidligere] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await db.from("portal_opgaver").select("*").order("dato", { ascending: false });
      if (error) { setFejl(error.message); setOpgaver([]); return; }
      setOpgaver(data ?? []);
    })();
  }, []);

  if (opgaver === null) return <div style={{ ...F.kort, color: "#94A3B8" }}>Henter opgaver…</div>;
  if (fejl) return <div style={{ ...F.kort, color: "#B91C1C" }}>Opgaverne kunne ikke hentes. Prøv igen om lidt.</div>;

  const idag = new Date().setHours(0, 0, 0, 0);
  const kommende = opgaver.filter((o) => o.status !== "udført" && new Date(o.dato) >= idag)
    .sort((a, b) => String(a.dato).localeCompare(String(b.dato)));
  const tidligere = opgaver.filter((o) => !kommende.includes(o));

  return (
    <>
      <div style={F.kort}>
        <div style={F.maerkat}>Planlagt</div>
        {kommende.length === 0
          ? <div style={{ fontSize: 14.5, color: "#64748B" }}>Der er ikke planlagt noget lige nu.</div>
          : kommende.map((o) => <Opgave key={o.id} o={o} />)}
      </div>

      <div style={F.kort}>
        <div style={F.maerkat}>Udført</div>
        {tidligere.length === 0 ? (
          <div style={{ fontSize: 14.5, color: "#64748B" }}>Der er ikke udført noget endnu.</div>
        ) : (
          <>
            {/* Kun de seneste vises. En kunde med to besøg om ugen har hundredvis af
                opgaver, og så bliver siden lang og langsom uden at blive bedre. */}
            {(visTidligere ? tidligere : tidligere.slice(0, 10)).map((o) => <Opgave key={o.id} o={o} />)}
            {!visTidligere && tidligere.length > 10 && (
              <button style={{ ...F.knap2, marginTop: 12 }} onClick={() => setVisTidligere(true)}>
                Vis alle {tidligere.length}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Kalender ─────────────────────────────────────────────────────────────────
//
// Kundens uge hos os. Samme data som fanen Opgaver — det er den samme view,
// portal_opgaver, som allerede er afgraenset til kundens eget dinero_contact_guid.
// Der bliver altsaa ikke synligt noget nyt; det bliver bare laesbart som en uge i
// stedet for to lister.
//
// Hvorfor en kalender overhovedet: to lister svarer paa "hvad er sket" og "hvad er
// aftalt". En kunde spoerger om noget tredje — "kommer I i denne uge?" — og det
// spoergsmaal kan man ikke svare paa uden at laese begge lister og selv holde styr
// paa datoerne.
//
// Knappen paa de tomme dage er ikke pynt. Uden den er kalenderen en kvittering for
// noget, der allerede er besluttet. Med den bliver et hul i ugen til en anledning.

const UGEDAGE = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

// Mandag i den uge en dato ligger i. Lokale datoer hele vejen — bruger man
// toISOString undervejs, skifter datoen en time om sommeren.
function mandagFor(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);                       // midt paa dagen: immun over for sommertid
  const forskydning = (x.getDay() + 6) % 7;      // man=0 … søn=6
  x.setDate(x.getDate() - forskydning);
  return x;
}

function isoDato(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function ugeNummer(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
  const foersteTorsdag = new Date(x.getFullYear(), 0, 4);
  foersteTorsdag.setHours(12, 0, 0, 0);
  foersteTorsdag.setDate(foersteTorsdag.getDate() + 3 - ((foersteTorsdag.getDay() + 6) % 7));
  return 1 + Math.round((x - foersteTorsdag) / (7 * 24 * 3600 * 1000));
}

function Kalender({ mig, onBedOmBesoeg }) {
  const [opgaver, setOpgaver] = useState(null);
  const [bestilteIder, setBestilteIder] = useState(new Set());
  const [fejl, setFejl] = useState("");
  const [mandag, setMandag] = useState(() => mandagFor(new Date()));

  useEffect(() => {
    (async () => {
      const [o, b] = await Promise.all([
        db.from("portal_opgaver").select("*"),
        db.rpc("hent_portal_bestillinger"),
      ]);
      // Fejlen maa ikke kastes vaek. En tom uge og "kunne ikke hentes" ser ens ud,
      // og forskellen er om kunden skal ringe til os eller ej.
      if (o.error) { setFejl(o.error.message); setOpgaver([]); return; }
      setOpgaver(o.data ?? []);
      // Bestillinger er ikke kritiske for kalenderen — de bestemmer kun et maerke.
      // Fejler de, viser vi ugen alligevel.
      setBestilteIder(new Set((b.data ?? []).map((x) => x.instance_id).filter(Boolean)));
    })();
  }, []);

  if (opgaver === null) return <div style={{ ...F.kort, color: "#94A3B8" }}>Henter kalenderen…</div>;
  if (fejl) return <div style={{ ...F.kort, color: "#B91C1C" }}>Kalenderen kunne ikke hentes. Prøv igen om lidt.</div>;

  const dage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mandag);
    d.setDate(d.getDate() + i);
    return d;
  });
  const iDag = isoDato(new Date());

  const forDag = (iso) => opgaver
    .filter((o) => String(o.dato).slice(0, 10) === iso)
    .sort((a, b) => String(a.tidspunkt || "99").localeCompare(String(b.tidspunkt || "99")));

  // Weekend vises kun naar der faktisk sker noget. Fem tomme rubrikker med
  // "Ingen besøg" hver uge er stoej for en kunde, der aldrig faar rengjort om
  // soendagen.
  const synligeDage = dage.filter((d, i) => i < 5 || forDag(isoDato(d)).length > 0);

  const slut = new Date(mandag); slut.setDate(slut.getDate() + 4);
  const maanedTekst = mandag.getMonth() === slut.getMonth()
    ? `${mandag.getDate()}.–${slut.getDate()}. ${slut.toLocaleDateString("da-DK", { month: "long", year: "numeric" })}`
    : `${mandag.getDate()}. ${mandag.toLocaleDateString("da-DK", { month: "short" })} – ${slut.getDate()}. ${slut.toLocaleDateString("da-DK", { month: "short", year: "numeric" })}`;

  function skiftUge(uger) {
    const n = new Date(mandag);
    n.setDate(n.getDate() + uger * 7);
    setMandag(n);
  }

  const maerke = (tekst, farve, bag) => (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                   background: bag, color: farve, whiteSpace: "nowrap" }}>{tekst}</span>
  );

  return (
    <div style={F.kort}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 6 }}>
        <button onClick={() => skiftUge(-1)} aria-label="Forrige uge"
          style={{ border: "none", background: "transparent", cursor: "pointer",
                   fontSize: 22, color: "#64748B", padding: "4px 12px", minHeight: 44 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Uge {ugeNummer(mandag)}</div>
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>{maanedTekst}</div>
        </div>
        <button onClick={() => skiftUge(1)} aria-label="Næste uge"
          style={{ border: "none", background: "transparent", cursor: "pointer",
                   fontSize: 22, color: "#64748B", padding: "4px 12px", minHeight: 44 }}>›</button>
      </div>

      {isoDato(mandag) !== isoDato(mandagFor(new Date())) && (
        <button style={{ ...F.knap2, marginBottom: 10, padding: "9px 0", fontSize: 13.5 }}
          onClick={() => setMandag(mandagFor(new Date()))}>Gå til denne uge</button>
      )}

      {synligeDage.map((d) => {
        const iso = isoDato(d);
        const dagens = forDag(iso);
        const erIDag = iso === iDag;
        const erFortid = iso < iDag;
        return (
          <div key={iso} style={{ display: "flex", gap: 14, padding: "12px 0",
                                  borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ width: 68, flexShrink: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700,
                            color: erIDag ? "#D6247A" : dagens.length ? "#111111" : "#94A3B8" }}>
                {UGEDAGE[(d.getDay() + 6) % 7]} {d.getDate()}.
              </div>
              {erIDag && <div style={{ fontSize: 11, fontWeight: 700, color: "#D6247A" }}>i dag</div>}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {dagens.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                              gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, color: "#94A3B8" }}>Ingen besøg</span>
                  {/* Kun fremad, og kun paa den udvidede portal. At bede om et besoeg
                      i sidste uge giver ingen mening, og knappen skal ikke findes for
                      kunder der ikke kan bestille. */}
                  {!erFortid && mig.option === "udvidet" && (
                    <button onClick={() => onBedOmBesoeg(iso)}
                      style={{ border: "1.5px solid #E2E8F0", background: "#fff", color: "#334155",
                               borderRadius: 999, padding: "7px 14px", fontSize: 12.5,
                               fontWeight: 700, cursor: "pointer", minHeight: 38 }}>
                      Bed om et besøg
                    </button>
                  )}
                </div>
              ) : dagens.map((o) => {
                const bestilt = bestilteIder.has(o.id);
                const udfoert = o.status === "udført";
                // STATUS_TEKST og ikke mine egne maerkater. Foerste udgave skrev
                // "Planlagt" paa alt der ikke var udfoert — ogsaa paa opgaver med
                // status unscheduled, som endnu ikke har en medarbejder paa. Kunden
                // ville have faaet et loefte, planen ikke havde givet.
                const st = STATUS_TEKST[o.status] || STATUS_TEKST.planlagt;
                return (
                  <div key={o.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      {/* Aftalt klokkeslaet staar med fed. Er der ingen aftalt tid,
                          staar der slet ingen — et beregnet tidspunkt ville blive
                          laest som et loefte, og det er ikke vores at give her. */}
                      {o.tidspunkt && (
                        <span style={{ fontSize: 14, fontWeight: 700 }}>
                          {String(o.tidspunkt).slice(0, 5)}
                        </span>
                      )}
                      <span style={{ fontSize: 14, color: "#111111" }}>{o.titel}</span>
                      {maerke(st.tekst, st.farve, st.bag)}
                      {bestilt && maerke("Jeres bestilling", "#9C1B5D", "#FCE4EF")}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 2 }}>
                      {udfoert && o.registreret_minutter > 0 ? tid(o.registreret_minutter) : null}
                      {udfoert && o.registreret_minutter > 0 && o.udfoert_af ? " · " : null}
                      {udfoert && o.udfoert_af ? o.udfoert_af : null}
                      {!udfoert && o.planlagt_minutter ? `Afsat ${tid(o.planlagt_minutter)}` : null}
                      {!o.tidspunkt && !udfoert ? " · tidspunkt ikke aftalt" : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={F.hint}>
        Kalenderen viser det, der er planlagt lige nu. Bliver et besøg flyttet, ændrer
        ugen sig — ring til kontoret, hvis noget ser forkert ud.
      </div>
    </div>
  );
}

// ── Fakturaer ────────────────────────────────────────────────────────────────
function Faktura({ f }) {
  const [aaben, setAaben] = useState(false);
  const [linjer, setLinjer] = useState(null);
  const [henterPdf, setHenterPdf] = useState(false);
  const s = FAKTURA_STATUS[f.Status] || { tekst: f.Status, farve: "#64748B" };

  async function foldUd() {
    setAaben(!aaben);
    if (linjer || aaben) return;
    const { data } = await db.functions.invoke("dinero", {
      body: { action: "fakturalinjer", query: f.Guid },
    });
    setLinjer(data?.ok ? data : { fejl: true });
  }

  // PDF'en hentes som data og åbnes i et nyt vindue. Et direkte link ville sende
  // kunden til Dineros egen adresse, og den kræver et token vi ikke må dele.
  async function aabnPdf() {
    setHenterPdf(true);
    try {
      const { data } = await db.functions.invoke("dinero", {
        body: { action: "fakturaPdf", query: f.Guid },
      });
      const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      // Adressen frigives igen, men først når vinduet har nået at læse den.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { /* knappen bliver bare klikbar igen */ }
    setHenterPdf(false);
  }

  return (
    <div style={{ borderBottom: "1px solid #F1F5F9", padding: "12px 0" }}>
      <div onClick={foldUd} style={{ cursor: "pointer", minHeight: 44,
                                     display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{fakturaNummer(f)}</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
            {datoKort(f.Date)}
            {f.Description ? ` · ${f.Description}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{kr(f.TotalInclVat)}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: s.farve, marginTop: 3 }}>{s.tekst}</div>
        </div>
      </div>

      {aaben && (
        <div style={{ marginTop: 10 }}>
          {linjer === null && <div style={{ fontSize: 13.5, color: "#94A3B8" }}>Henter linjer…</div>}
          {linjer?.fejl && <div style={{ fontSize: 13.5, color: "#B91C1C" }}>Linjerne kunne ikke hentes.</div>}
          {linjer?.linjer && (
            <>
              {linjer.linjer.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                                      gap: 10, fontSize: 13.5, padding: "5px 0" }}>
                  <div style={{ minWidth: 0 }}>
                    <div>{l.beskrivelse}</div>
                    {l.bemaerkning && <div style={{ color: "#94A3B8", fontSize: 12.5 }}>{l.bemaerkning}</div>}
                    <div style={{ color: "#94A3B8", fontSize: 12.5 }}>
                      {String(l.antal).replace(".", ",")} × {kr(l.stykpris)}
                    </div>
                  </div>
                  <div style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{kr(l.total)}</div>
                </div>
              ))}
              <div style={{ ...F.raekke, marginTop: 6 }}>
                <span style={{ color: "#64748B" }}>Ekskl. moms</span><span>{kr(linjer.exMoms)}</span>
              </div>
              <div style={F.raekke}>
                <span style={{ color: "#64748B" }}>Moms</span><span>{kr(linjer.moms)}</span>
              </div>
              <div style={{ ...F.raekke, borderBottom: "none", fontWeight: 700 }}>
                <span>I alt</span><span>{kr(linjer.inklMoms)}</span>
              </div>
            </>
          )}
          {f.Status !== "Draft" && (
            <button style={{ ...F.knap2, marginTop: 10, opacity: henterPdf ? 0.6 : 1 }}
              onClick={aabnPdf} disabled={henterPdf}>
              {henterPdf ? "Henter…" : "Åbn fakturaen som PDF"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Fakturaer() {
  const [fakturaer, setFakturaer] = useState(null);
  const [fejl, setFejl] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await db.functions.invoke("dinero", { body: { action: "kundefakturaer" } });
      if (error || data?.error) { setFejl("ja"); setFakturaer([]); return; }
      setFakturaer(data?.fakturaer ?? []);
    })();
  }, []);

  if (fakturaer === null) return <div style={{ ...F.kort, color: "#94A3B8" }}>Henter fakturaer…</div>;

  return (
    <div style={F.kort}>
      <div style={F.maerkat}>Fakturaer</div>
      {fejl && <div style={{ fontSize: 14.5, color: "#B91C1C" }}>Fakturaerne kunne ikke hentes lige nu. Prøv igen om lidt.</div>}
      {!fejl && fakturaer.length === 0 && (
        <div style={{ fontSize: 14.5, color: "#64748B" }}>Der er ingen fakturaer endnu.</div>
      )}
      {/* Kladder er ikke sendt endnu og er ikke kundens at forholde sig til. */}
      {fakturaer.filter((f) => f.Status !== "Draft").map((f) => <Faktura key={f.Guid} f={f} />)}
    </div>
  );
}

// ── Brugere ──────────────────────────────────────────────────────────────────
function Brugere({ mig }) {
  const [brugere, setBrugere] = useState(null);
  const [navn, setNavn] = useState("");
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState("bruger");
  const [arbejder, setArbejder] = useState(false);
  const [besked, setBesked] = useState("");
  const erAdmin = mig?.min_rolle === "admin";

  const hent = useCallback(async () => {
    const { data } = await db.from("portal_brugere")
      .select("id, navn, email, rolle, aktiv").order("navn");
    setBrugere(data ?? []);
  }, []);
  useEffect(() => { hent(); }, [hent]);

  async function inviter() {
    if (!email.includes("@")) return;
    setArbejder(true); setBesked("");
    const { data, error } = await db.functions.invoke("inviter-bruger", {
      body: { type: "portal", email: email.trim(), navn: navn.trim() || null, rolle },
    });
    setArbejder(false);
    if (error || data?.error) { setBesked("Det kunne ikke lade sig gøre. Ring til kontoret."); return; }
    setBesked(data?.mailSendt === false
      ? "Brugeren er oprettet, men invitationsmailen kunne ikke sendes. Ring til kontoret."
      : `${email.trim()} har fået en mail med et login.`);
    setNavn(""); setEmail(""); setRolle("bruger");
    hent();
  }

  async function saetAktiv(b, aktiv) {
    if (!window.confirm(aktiv
      ? `Giv ${b.navn || b.email} adgang igen?`
      : `Luk adgangen for ${b.navn || b.email}?`)) return;
    await db.from("portal_brugere").update({ aktiv }).eq("id", b.id);
    hent();
  }

  return (
    <>
      <div style={F.kort}>
        <div style={F.maerkat}>Brugere hos {mig?.visningsnavn}</div>
        {brugere === null && <div style={{ color: "#94A3B8", fontSize: 14 }}>Henter…</div>}
        {(brugere ?? []).map((b) => (
          <div key={b.id} style={{ ...F.raekke, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, opacity: b.aktiv ? 1 : 0.5 }}>{b.navn || b.email}</div>
              <div style={{ fontSize: 12.5, color: "#94A3B8" }}>
                {b.email}
                {b.rolle === "admin" ? " · administrator" : ""}
                {b.aktiv ? "" : " · adgang lukket"}
              </div>
            </div>
            {/* Man kan ikke lukke sin egen adgang. Så ville den sidste administrator
                kunne låse hele virksomheden ude af portalen ved et uheld. */}
            {erAdmin && b.email !== mig?.min_email && (
              <button style={{ background: "none", border: "none", cursor: "pointer",
                               fontSize: 13, fontWeight: 700, color: b.aktiv ? "#B91C1C" : "#166534" }}
                onClick={() => saetAktiv(b, !b.aktiv)}>
                {b.aktiv ? "Luk adgang" : "Åbn igen"}
              </button>
            )}
          </div>
        ))}
      </div>

      {erAdmin && (
        <div style={F.kort}>
          <div style={F.maerkat}>Giv en kollega adgang</div>
          <input style={{ ...F.felt, marginBottom: 10 }} value={navn} placeholder="Navn"
            autoComplete="name" onChange={(e) => setNavn(e.target.value)} />
          <input style={{ ...F.felt, marginBottom: 10 }} type="email" value={email}
            placeholder="mail@virksomhed.dk" inputMode="email" autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} />
          <select style={{ ...F.felt, marginBottom: 12 }} value={rolle}
            onChange={(e) => setRolle(e.target.value)}>
            <option value="bruger">Bruger — kan se opgaver og fakturaer</option>
            <option value="admin">Administrator — kan også oprette kolleger</option>
          </select>
          <button style={{ ...F.knap, opacity: arbejder ? 0.6 : 1 }}
            onClick={inviter} disabled={arbejder || !email.includes("@")}>
            {arbejder ? "Sender…" : "Send invitation"}
          </button>
          {besked && <div style={{ ...F.hint, color: "#166534" }}>{besked}</div>}
        </div>
      )}

      {!erAdmin && (
        <div style={{ ...F.kort, fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
          Det er jeres administrator der giver adgang til nye brugere.
        </div>
      )}
    </>
  );
}

// ── Bestil ───────────────────────────────────────────────────────────────────
//
// Kun paa Udvidet. Kunden vaelger en ydelse fra listen eller skriver sit eget
// oenske, og bestillingen gaar til planlaeggeren som et OENSKE - ikke som en
// opgave. Derfor staar der heller ingen pris nogen steder: bestillingen er ikke
// en aftale endnu, og et beloeb paa skaermen ville blive laest som et tilsagn.
// Godkendt arbejde faktureres bagefter ad samme vej som alt andet.
const BESTIL_STATUS = {
  ny:       { tekst: "Afventer svar", farve: "#B45309", bag: "#FFFBEB" },
  godkendt: { tekst: "Godkendt",      farve: "#166534", bag: "#F0FDF4" },
  afvist:   { tekst: "Afvist",        farve: "#B91C1C", bag: "#FEF2F2" },
};

// startDato kommer fra kalenderen, naar kunden trykker "Bed om et besoeg" paa en
// tom dag. Uden den skulle hun selv finde datoen frem igen — og saa er halvdelen af
// pointen med knappen vaek.
function Bestil({ mig, startDato }) {
  const [ydelser, setYdelser] = useState([]);
  const [mine, setMine] = useState(null);
  const [ydelseId, setYdelseId] = useState("");
  const [fritekst, setFritekst] = useState("");
  const [dato, setDato] = useState(startDato || "");
  const [adresse, setAdresse] = useState("");
  const [bemaerkning, setBemaerkning] = useState("");
  const [sender, setSender] = useState(false);
  const [fejl, setFejl] = useState("");
  const [kvittering, setKvittering] = useState(false);

  const hentMine = useCallback(async () => {
    const { data } = await db.rpc("hent_portal_bestillinger");
    setMine(data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await db.rpc("hent_portal_ydelser");
      setYdelser(data ?? []);
    })();
    hentMine();
  }, [hentMine]);

  const valgt = ydelser.find((y) => y.id === ydelseId) || null;
  // Enten et punkt fra listen eller noget skrevet. Samme krav som i databasen -
  // staar det kun ét af stederne, opdager man foerst manglen naar det fejler.
  const kanSende = !!ydelseId || fritekst.trim().length > 0;

  async function send() {
    if (!kanSende || sender) return;
    setSender(true); setFejl("");
    const { error } = await db.from("portal_bestillinger").insert({
      id: "pb" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      dinero_contact_guid: mig.guid,
      ydelse_id: ydelseId || null,
      // Titlen fastholdes som den var. Aendrer kontoret ydelsen bagefter, skal
      // bestillingen stadig kunne laeses som den blev afgivet.
      ydelse_titel: valgt?.titel ?? null,
      fritekst: fritekst.trim() || null,
      oensket_dato: dato || null,
      adresse: adresse.trim() || null,
      bemaerkning: bemaerkning.trim() || null,
      status: "ny",
      bestilt_af_email: mig.min_email ?? null,
      bestilt_af_navn: mig.mit_navn ?? null,
    });
    setSender(false);
    if (error) { setFejl("Bestillingen kunne ikke sendes. Prøv igen, eller ring til kontoret."); return; }

    setYdelseId(""); setFritekst(""); setDato(""); setAdresse(""); setBemaerkning("");
    setKvittering(true);
    hentMine();
    // Beskeden sendes med kundens EGET login, ikke som et aabent kald. Saa kan
    // funktionen se hvem der bestiller og selv finde bestillingen — guid'et maa
    // ikke kunne oplyses udefra.
    //
    // Mailen maa ikke kunne vaelte bestillingen. Raekken ER gemt, og planlaeggeren
    // ser den i Ugeplan uanset om mailen naaede frem.
    db.functions.invoke("bestilling-besked", { body: { handling: "ny" } }).catch(() => {});
  }

  return (
    <>
      <div style={F.kort}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Bestil ekstra arbejde</div>
        <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 16 }}>
          Vælg en ydelse, eller skriv hvad I har brug for. Vi vender tilbage med en
          aftale om tid og pris — bestillingen er ikke bindende.
        </div>

        {kvittering && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10,
                        padding: "12px 14px", fontSize: 14, color: "#166534",
                        lineHeight: 1.55, marginBottom: 16 }}>
            Tak — bestillingen er sendt. Den står nederst på siden, og I hører fra os.
          </div>
        )}

        <label style={{ ...F.hint, marginTop: 0, fontWeight: 700, color: "#334155" }}>Ydelse</label>
        <select style={{ ...F.felt, marginTop: 6 }} value={ydelseId}
          onChange={(e) => { setYdelseId(e.target.value); setKvittering(false); }}>
          <option value="">— vælg, eller beskriv selv nedenfor —</option>
          {ydelser.map((y) => <option key={y.id} value={y.id}>{y.titel}</option>)}
        </select>
        {valgt?.beskrivelse && <div style={F.hint}>{valgt.beskrivelse}</div>}

        <label style={{ ...F.hint, fontWeight: 700, color: "#334155", marginTop: 16 }}>
          {ydelseId ? "Uddyb gerne" : "Hvad har I brug for?"}
        </label>
        <textarea style={{ ...F.felt, marginTop: 6, minHeight: 90, resize: "vertical",
                           fontFamily: "inherit", lineHeight: 1.5 }}
          value={fritekst} maxLength={2000}
          placeholder={ydelseId ? "Fx hvor mange lokaler det drejer sig om."
                                : "Beskriv opgaven med dine egne ord."}
          onChange={(e) => { setFritekst(e.target.value); setKvittering(false); }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ ...F.hint, marginTop: 0, fontWeight: 700, color: "#334155" }}>
              Ønsket dato
            </label>
            <input style={{ ...F.felt, marginTop: 6 }} type="date" value={dato}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDato(e.target.value)} />
          </div>
          <div style={{ flex: "2 1 220px" }}>
            <label style={{ ...F.hint, marginTop: 0, fontWeight: 700, color: "#334155" }}>
              Adresse
            </label>
            <input style={{ ...F.felt, marginTop: 6 }} value={adresse}
              placeholder="Kun hvis det ikke er den sædvanlige"
              onChange={(e) => setAdresse(e.target.value)} />
          </div>
        </div>

        <label style={{ ...F.hint, fontWeight: 700, color: "#334155", marginTop: 16 }}>
          Adgang og bemærkninger
        </label>
        <input style={{ ...F.felt, marginTop: 6 }} value={bemaerkning} maxLength={500}
          placeholder="Fx hvem vi skal spørge efter, eller hvornår der er åbent"
          onChange={(e) => setBemaerkning(e.target.value)} />

        {fejl && <div style={{ ...F.hint, color: "#B91C1C" }}>{fejl}</div>}

        <button style={{ ...F.knap, marginTop: 18, opacity: kanSende && !sender ? 1 : 0.5 }}
          onClick={send} disabled={!kanSende || sender}>
          {sender ? "Sender…" : "Send bestilling"}
        </button>
        <div style={F.hint}>
          Vi ringer eller skriver, før arbejdet sættes i gang. Der trækkes ingen betaling
          her — godkendt arbejde kommer på den almindelige faktura.
        </div>
      </div>

      <div style={F.kort}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Jeres bestillinger</div>
        {mine === null && <div style={{ color: "#94A3B8", fontSize: 14 }}>Henter…</div>}
        {mine?.length === 0 && (
          <div style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.6 }}>
            I har ikke bestilt noget endnu.
          </div>
        )}
        {mine?.map((b) => {
          const st = BESTIL_STATUS[b.status] || BESTIL_STATUS.ny;
          return (
            <div key={b.id} style={{ borderBottom: "1px solid #F1F5F9", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                  {b.ydelse_titel || "Egen beskrivelse"}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: st.farve, background: st.bag,
                               borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                  {st.tekst}
                </span>
              </div>
              {b.fritekst && (
                <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.55, marginTop: 4 }}>
                  {b.fritekst}
                </div>
              )}
              <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 6 }}>
                Bestilt {datoKort(b.oprettet)}
                {b.oensket_dato ? ` · ønsket ${datoKort(b.oensket_dato)}` : ""}
                {b.bestilt_af_navn ? ` · ${b.bestilt_af_navn}` : ""}
              </div>
              {b.status === "afvist" && b.planlaegger_note && (
                <div style={{ fontSize: 13.5, color: "#B91C1C", lineHeight: 1.55, marginTop: 6 }}>
                  {b.planlaegger_note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Hjælp ────────────────────────────────────────────────────────────────────
function Hjaelp({ mig }) {
  const afsnit = [
    ["Sådan logger du ind", [
      "Der er ingen adgangskode. Du skriver din mail, og vi sender dig en kode.",
      "Skriv koden i feltet der venter i browseren. Hold fanen åben imens — det er dér koden skal ind.",
      "Koden virker én gang og udløber efter en time. Bed roligt om en ny hvis den er brugt.",
      "Vi sender en kode og ikke et link, fordi mange firmaers sikkerhedsfilter åbner links automatisk for at scanne dem. Det brugte login'et op, før du selv nåede at trykke.",
      "Giv aldrig koden videre. Vi beder dig aldrig om den i telefonen.",
      "Du forbliver logget ind på den enhed indtil du selv logger ud.",
    ]],
    ["Opgaver", [
      "Under Planlagt står det arbejde der er aftalt fremad. Tryk på en opgave for at se adressen og hvad der er med i den.",
      "Under Udført står det der er lavet, med tidsforbrug og hvem der var hos jer.",
      "Tidsforbruget er den tid der faktisk er registreret på stedet — ikke den planlagte.",
      "Punkterne på tjeklisten bliver sat af mens arbejdet udføres, så en opgave i gang kan have nogle punkter tilbage.",
    ]],
    ["Fakturaer", [
      "Her ligger de fakturaer der er sendt til jer. Tryk på en for at folde linjerne ud eller åbne den som PDF.",
      "Fakturaer der endnu ikke er sendt, vises ikke — de kan stadig nå at blive ændret.",
      "«Afventer betaling» betyder at fakturaen er sendt. «Forfalden» at betalingsfristen er passeret.",
      "Portalen er kun til at se i. Har du en indsigelse til en faktura, så ring til kontoret.",
    ]],
    ["Bestil ekstra arbejde", [
      "Fanen Bestil findes kun, hvis I har den udvidede portal. Kan I ikke se den, så ring til kontoret.",
      "Vælg en ydelse på listen, eller skriv med jeres egne ord hvad I har brug for. I kan gøre begge dele.",
      "Skriv gerne en ønsket dato. Den er et ønske, ikke en aftale — vi vender tilbage, før noget sættes i gang.",
      "Der står ingen pris, og der trækkes ingen betaling. Siger vi ja, kommer arbejdet på den almindelige faktura efter den tid der bliver brugt.",
      "Nederst på siden kan I følge jeres bestillinger. «Afventer svar» betyder at vi har set den, men endnu ikke svaret.",
      "Bliver en bestilling afvist, står begrundelsen samme sted, og I får den også på mail.",
      "En bestilling kan ikke rettes, når den først er sendt. Har I skrevet forkert, så send en ny eller ring til kontoret.",
    ]],
    ["Brugere", [
      "Jeres administrator kan give kolleger adgang, og lukke adgangen igen når nogen stopper.",
      "En administrator kan også gøre en kollega til administrator.",
      "Man kan ikke lukke sin egen adgang — ellers kunne den sidste administrator komme til at låse jer alle ude.",
    ]],
    ["Kalenderen", [
      "Fanen Kalender viser jeres uge hos os: hvilke dage vi kommer, hvad der er aftalt, og hvad der er lavet.",
      "Bladr mellem ugerne med pilene. Står der «i dag» ud for en dag, er det den, I står på.",
      "Er klokkeslættet skrevet med fed, er det den tid, der er aftalt. Står der «tidspunkt ikke aftalt», kommer vi den dag, men vi har ikke lovet et klokkeslæt.",
      "«Ikke planlagt endnu» betyder, at dagen er aftalt, men at vi endnu ikke har sat en medarbejder på. Det plejer at falde på plads ugen før.",
      "Har I den udvidede portal, kan I bede om et besøg direkte fra en tom dag. Så åbnes bestillingen med datoen udfyldt.",
      "Bestillinger, vi har sagt ja til, står i kalenderen med mærket «Jeres bestilling».",
      "Kalenderen viser det, der er planlagt lige nu. Ser en uge tom ud, hvor I havde ventet et besøg, så ring til kontoret — det er ikke sikkert, det er med vilje.",
    ]],
    ["Hvad vi kan se, og hvad vi ikke kan", [
      "Du ser kun jeres egne opgaver og fakturaer. Det er afgrænset i databasen, ikke bare i skærmbilledet.",
      "Interne oplysninger som medarbejdernes løn, vores kostpriser og noter mellem kontoret og medarbejderne kommer aldrig med.",
      "Har du brug for noget der ikke står her, så ring til kontoret.",
    ]],
    // Skrevet ud fra de felter der faktisk findes i databasen, ikke ud fra en
    // skabelon. Aendrer vi hvad portalen gemmer, skal teksten her rettes med.
    ["Sådan behandler vi jeres oplysninger", [
      "Jammerbugt Rengøring er ansvarlig for de oplysninger, vi gemmer om jer. Her står hvad det er.",
      "Om jer: firmanavn eller navn, adresse, kontaktperson og e-mail. Til portalen desuden hvem der har adgang, og hvem der er administrator.",
      "Om arbejdet: hvad der er aftalt, hvornår det er udført, hvor lang tid det tog, og de noter og billeder medarbejderen lægger på opgaven.",
      "Adgangsforhold til jeres adresse, hvis vi skal kunne komme ind — se afsnittet nedenfor.",
      "Om økonomien: fakturaer, priser og aftalte satser.",
      "Bestiller I ekstra arbejde, gemmer vi bestillingen med jeres ønskede dato og bemærkninger.",
    ]],
    ["Når I accepterer et tilbud", [
      "Ud over jeres navn og e-mail gemmer vi tidspunktet, IP-adressen og hvilken browser der blev brugt, sammen med et fingeraftryk af selve dokumentet.",
      "Det er alene, for at begge parter kan dokumentere hvad der blev aftalt, og hvornår. Fingeraftrykket betyder, at indholdet ikke kan ændres bagefter — hverken af jer eller af os.",
      "Vi beder ikke om jeres samtykke til det, og det er med vilje. Grundlaget er dokumentation for en indgået aftale. Et samtykke kunne trækkes tilbage, og så stod begge parter uden bevis for den aftale, I netop havde accepteret.",
      "Oplysningerne bruges ikke til noget andet, og de videregives ikke.",
    ]],
    ["Nøglebokskoder og adgang til jeres adresse", [
      "Har I givet os en kode, ligger den ikke i medarbejdernes app og gemmes ikke på deres telefon.",
      "Koden hentes én ad gangen, og først når systemet har kontrolleret, at medarbejderen faktisk er sat på netop jeres opgave.",
      "Hvert eneste opslag bliver logget med hvem der hentede den, hvilken opgave og hvornår. Vi kan altså altid svare på, hvem der har haft koden.",
      "Koden slettes automatisk tre måneder efter, at opgaven er afsluttet.",
    ]],
    ["Hvor jeres oplysninger ligger", [
      "Databasen ligger hos Supabase i Stockholm. Portalens sider leveres af Netlify, hvor der ikke ligger nogen personoplysninger.",
      "Mails sendes gennem Brevo i Frankrig. Fakturaer behandles i Dinero i Danmark.",
      "Skal vi beregne afstanden til jeres adresse, sendes selve adressen til statens adresseregister og til et tysk ruteberegningsfirma. De får adressen, men ingen navne.",
      "Billeder fra opgaver slettes automatisk efter 12 måneder. Vil I have dem slettet før, siger I bare til — vi har en funktion til netop det.",
    ]],
    ["Jeres rettigheder", [
      "I har ret til at få at vide, hvad vi har registreret om jer, og til at få rettet noget der er forkert.",
      "I kan bede om at få oplysninger slettet. Fakturaer og aftaledokumentation skal vi dog gemme, så længe bogføringsloven kræver det.",
      "Er arbejdet visiteret af kommunen, er det kommunen der er ansvarlig for oplysningerne om borgeren. Henvendelser om dem skal rettes til kommunen — vi udfører alene arbejdet efter deres instruks.",
      "Ring til kontoret, hvis I vil gøre brug af noget af det, eller hvis I har spørgsmål til, hvordan vi behandler jeres oplysninger.",
    ]],
  ];

  return (
    <>
      {afsnit.map(([h, punkter]) => (
        <div key={h} style={F.kort}>
          <div style={F.maerkat}>{h}</div>
          {punkter.map((p, i) => (
            <div key={i} style={{ fontSize: 14.5, color: "#334155", lineHeight: 1.65,
                                  marginBottom: i === punkter.length - 1 ? 0 : 8 }}>
              {p}
            </div>
          ))}
        </div>
      ))}
      <div style={{ ...F.hint, textAlign: "center" }}>
        Logget ind som {mig?.min_email}
      </div>
    </>
  );
}

// ── Rammen om det hele ───────────────────────────────────────────────────────
export default function Portal({ slug }) {
  const [session, setSession] = useState(undefined);   // undefined = ved det ikke endnu
  const [mig, setMig] = useState(null);
  const [forside, setForside] = useState(null);
  const [fane, setFane] = useState("kalender");
  // Datoen kunden trykkede paa i kalenderen. Ligger her og ikke i Bestil, fordi den
  // skal overleve skiftet mellem de to faner.
  const [bestilDato, setBestilDato] = useState("");
  const [henterMig, setHenterMig] = useState(false);

  // Navn og logo på login-siden, så kunden kan se at hun er landet det rigtige sted.
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await db.rpc("hent_portal_forside", { p_slug: slug });
      setForside(data?.[0] ?? null);
    })();
  }, [slug]);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    // Kun bruger-id'et sammenlignes. Et token der fornyes, giver et nyt sessionsobjekt,
    // og satte vi det i state hver gang, ville hele siden hente sig selv forfra —
    // det kostede os en dag i medarbejder-appen.
    const { data: abon } = db.auth.onAuthStateChange((_h, ny) => {
      setSession((gl) => (gl?.user?.id === ny?.user?.id ? gl : (ny ?? null)));
    });
    return () => abon.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMig(null); return; }
    setHenterMig(true);
    (async () => {
      const { data } = await db.rpc("hent_portal_mig");
      setMig(data?.[0] ?? null);
      setHenterMig(false);
    })();
  }, [session?.user?.id]);

  if (session === undefined) {
    return <div style={{ ...F.kort, textAlign: "center", color: "#94A3B8" }}>Et øjeblik…</div>;
  }

  if (!session) return <LogInd forside={forside} slug={slug} />;

  if (henterMig) {
    return <div style={{ ...F.kort, textAlign: "center", color: "#94A3B8" }}>Henter din side…</div>;
  }

  // Logget ind, men ikke portalbruger — eller abonnementet er lukket. Det er ikke en
  // fejl kunden kan gøre noget ved selv, så beskeden peger på kontoret i stedet for
  // at forklare hvad der teknisk mangler.
  if (!mig) {
    return (
      <div style={F.kort}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Ingen adgang</div>
        <div style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6 }}>
          Din konto er ikke koblet til en aktiv portal. Ring til kontoret, så finder vi ud af det.
        </div>
        <button style={{ ...F.knap2, marginTop: 16 }} onClick={() => db.auth.signOut()}>Log ud</button>
      </div>
    );
  }

  // Kalenderen foerst og som standard. Det er den fane, der svarer paa det, kunden
  // oftest ringer om — "kommer I i denne uge?" — og de oevrige er opslag, man gaar
  // efter med vilje.
  const faner = [
    ["kalender", "Kalender"],
    ["opgaver", "Opgaver"],
    ...(mig.option === "udvidet" ? [["bestil", "Bestil"]] : []),
    ["fakturaer", "Fakturaer"],
    ["brugere", "Brugere"],
    ["hjaelp", "Hjælp"],
  ];

  return (
    <>
      <div style={{ ...F.kort, display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 12, padding: "14px 18px" }}>
        {/* minWidth 0 og ellipsis: uden dem skubber et langt firmanavn eller en lang
            mailadresse "Log ud" ud over kanten paa en telefon. En flex-boks kryber
            ikke under sit indhold af sig selv. */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mig.visningsnavn}</div>
          <div style={{ fontSize: 12.5, color: "#94A3B8", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mig.mit_navn || mig.min_email}</div>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer",
                         fontSize: 13, fontWeight: 700, color: "#64748B", minHeight: 44 }}
          onClick={() => db.auth.signOut()}>Log ud</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "#F1F5F9",
                    borderRadius: 12, padding: 4, marginBottom: 14 }}>
        {faner.map(([k, navn]) => (
          <button key={k} onClick={() => setFane(k)}
            style={{ ...F.fane, ...(fane === k ? F.faneAktiv : {}) }}>{navn}</button>
        ))}
      </div>

      {fane === "opgaver" && <Opgaver />}
      {fane === "kalender" && (
        <Kalender mig={mig} onBedOmBesoeg={(d) => { setBestilDato(d); setFane("bestil"); }} />
      )}
      {fane === "fakturaer" && <Fakturaer />}
      {/* key paa datoen tvinger en frisk formular, naar man kommer fra en anden dag i
          kalenderen. Uden den ville useState beholde den foerste dato, fordi
          startvaerdien kun laeses én gang. */}
      {fane === "bestil" && mig.option === "udvidet" && (
        <Bestil key={bestilDato || "tom"} mig={mig} startDato={bestilDato} />
      )}
      {fane === "brugere" && <Brugere mig={mig} />}
      {fane === "hjaelp" && <Hjaelp mig={mig} />}
    </>
  );
}
