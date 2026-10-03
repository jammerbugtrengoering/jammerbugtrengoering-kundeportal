import { useEffect, useMemo, useRef, useState } from "react";
import { useFirma } from "./firma.js";
import { db, kaldAaben } from "./db.js";

// ── /bestil — «Ring mig op» ─────────────────────────────────────────────────
// 3.10.2026, Jonn: QR-koden i pjecen peger hertil. Den, der står med pjecen, er typisk
// pensionist, får hjælp fra kommunen og har måske aldrig brugt en formular på telefonen.
//
// Derfor er siden bygget anderledes end resten af portalen:
//   * Stor skrift (20 px brødtekst), store felter og knapper (mindst 60 px høje), mørk
//     tekst på hvidt. Ingen grå hjælpetekst, man skal knibe øjnene sammen for at læse.
//   * Kun to ting skal udfyldes: navn og telefon. Alt andet står «kan springes over».
//   * Valg er store knapper, ikke rullelister og ikke små afkrydsningsfelter.
//   * Telefonnummeret står øverst som en knap. Mange vil hellere ringe, og det er fint.
//   * Fejl skrives i hele sætninger ved feltet, og siden ruller derhen.
//   * Ingen login, intet der skal huskes, intet gemt på telefonen.
//
// Siden kan kun SENDE. Den læser intet fra databasen ud over firmaets navn og telefon.
// Al kontrol ligger i edge-funktionen henvendelse-modtag.

const ONSKER = [
  ["fast", "Fast rengøring"],
  ["hovedrengoering", "Hovedrengøring"],
  ["vinduer", "Vinduespudsning"],
  ["ovn_koeleskab", "Ovn og køleskab"],
  ["toejvask", "Tøjvask og strygning"],
  ["hoejtid", "Klar til højtid eller gæster"],
];

const S = {
  side: { maxWidth: 640, margin: "0 auto", padding: "22px 18px 80px", color: "#111", fontSize: 20, lineHeight: 1.5 },
  h1: { fontSize: 32, lineHeight: 1.2, fontWeight: 800, margin: "4px 0 12px" },
  kort: { background: "#fff", borderRadius: 16, padding: "22px 20px", marginBottom: 18, boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
  label: { display: "block", fontSize: 21, fontWeight: 700, marginBottom: 10 },
  valgfri: { fontWeight: 500, color: "#333" },
  felt: {
    width: "100%", minHeight: 62, padding: "14px 16px", fontSize: 21, borderRadius: 12,
    border: "2px solid #888", background: "#fff", color: "#111", boxSizing: "border-box",
  },
  feltFejl: { border: "3px solid #B00020" },
  fejl: { color: "#B00020", fontWeight: 700, fontSize: 19, marginTop: 8 },
  valgRaekke: { display: "grid", gap: 10 },
  valg: {
    minHeight: 62, padding: "12px 16px", fontSize: 20, fontWeight: 600, borderRadius: 12,
    border: "2px solid #888", background: "#fff", color: "#111", textAlign: "left", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 14, width: "100%",
  },
  valgAktiv: { border: "3px solid var(--farve-moerk)", background: "var(--farve-bleg)" },
  boks: {
    width: 30, height: 30, flex: "0 0 30px", borderRadius: 8, border: "2px solid #555",
    display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, background: "#fff",
  },
  knap: {
    width: "100%", minHeight: 68, borderRadius: 14, border: "none", background: "var(--farve-moerk)",
    color: "#fff", fontSize: 23, fontWeight: 800, cursor: "pointer",
  },
  ringKnap: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 64,
    borderRadius: 14, border: "2px solid var(--farve-moerk)", color: "var(--farve-moerk)",
    background: "#fff", fontSize: 22, fontWeight: 800, textDecoration: "none",
  },
};

// «+45 61608720» -> «61 60 87 20». Danske numre læses i par.
function visNummer(t) {
  const c = String(t || "").replace(/\D/g, "").replace(/^45(?=\d{8}$)/, "");
  return c.length === 8 ? c.replace(/(\d{2})(?=\d)/g, "$1 ") : String(t || "");
}
function telLink(t) {
  const c = String(t || "").replace(/\D/g, "").replace(/^45(?=\d{8}$)/, "");
  return c.length === 8 ? `tel:+45${c}` : `tel:${t}`;
}

function Valg({ aktiv, onClick, children, flere }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={aktiv}
      style={{ ...S.valg, ...(aktiv ? S.valgAktiv : null) }}>
      <span style={{ ...S.boks, borderRadius: flere ? 8 : 15, ...(aktiv ? { background: "var(--farve-moerk)", borderColor: "var(--farve-moerk)", color: "#fff" } : null) }}>
        {aktiv ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}

export default function Bestil() {
  const firma = useFirma(db);
  const start = useRef(Date.now());
  const kilde = useMemo(() => {
    const k = new URLSearchParams(window.location.search).get("k") || "portal";
    return k.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "portal";
  }, []);

  const [navn, setNavn] = useState("");
  const [telefon, setTelefon] = useState("");
  const [ringTid, setRingTid] = useState("lige_meget");
  const [kommune, setKommune] = useState("");
  const [oensker, setOensker] = useState([]);
  const [adresse, setAdresse] = useState("");
  const [besked, setBesked] = useState("");
  const [hjemmeside, setHjemmeside] = useState(""); // honningkrukke — mennesker ser den ikke
  const [fejl, setFejl] = useState({});
  const [sender, setSender] = useState(false);
  const [resultat, setResultat] = useState(null); // null | "ok" | "travlt" | "fejl"
  const navnRef = useRef(null);
  const telRef = useRef(null);

  const tlf = firma.telefon || "+45 61608720";
  useEffect(() => { document.title = `Bliv ringet op · ${firma.navn}`; }, [firma.navn]);

  function skift(id) {
    setOensker((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  }

  async function send(e) {
    e.preventDefault();
    const f = {};
    if (!navn.trim()) f.navn = "Skriv dit navn, så vi ved, hvem vi ringer til.";
    const cifre = telefon.replace(/\D/g, "");
    if (cifre.length < 8) f.telefon = "Skriv dit telefonnummer med 8 cifre, fx 12 34 56 78.";
    setFejl(f);
    if (f.navn || f.telefon) {
      const forst = f.navn ? navnRef.current : telRef.current;
      forst?.scrollIntoView({ behavior: "smooth", block: "center" });
      forst?.focus({ preventScroll: true });
      return;
    }
    setSender(true);
    try {
      const svar = await kaldAaben("henvendelse-modtag", {
        navn, telefon, adresse, besked, oensker, ring_tid: ringTid,
        kommune_hjaelp: kommune || "ved_ikke", kilde, hjemmeside, brugt_ms: Date.now() - start.current,
      });
      if (svar?.ok) setResultat("ok");
      else if (svar?.error === "travlt") setResultat("travlt");
      else if (svar?.error === "telefon_ugyldig") {
        setFejl({ telefon: "Telefonnummeret ser ikke rigtigt ud. Tjek det, og prøv igen." });
        telRef.current?.focus();
      } else setResultat("fejl");
    } catch {
      setResultat("fejl");
    }
    setSender(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const RingSelv = ({ tekst = "Ring til os" }) => (
    <a href={telLink(tlf)} style={S.ringKnap}>
      <span aria-hidden="true">📞</span> {tekst}: {visNummer(tlf)}
    </a>
  );

  if (resultat === "ok") {
    return (
      <div style={S.side}>
        <div style={{ ...S.kort, textAlign: "center", padding: "34px 22px" }}>
          <div aria-hidden="true" style={{ width: 84, height: 84, borderRadius: 42, margin: "0 auto 18px",
            background: "#1B7F3B", color: "#fff", fontSize: 52, fontWeight: 900, display: "grid", placeItems: "center" }}>✓</div>
          <h1 style={S.h1}>Tak, {navn.trim().split(" ")[0]}</h1>
          <p style={{ margin: "0 0 10px" }}>
            Vi ringer til dig på <b>{telefon}</b> inden for to hverdage
            {ringTid === "formiddag" ? ", om formiddagen" : ringTid === "eftermiddag" ? ", om eftermiddagen" : ""}.
          </p>
          <p style={{ margin: 0 }}>Du behøver ikke gøre mere. Du kan godt lukke siden nu.</p>
        </div>
        <RingSelv tekst="Har du travlt? Ring" />
        <p style={{ fontSize: 18, marginTop: 22, textAlign: "center" }}>{firma.navn}</p>
      </div>
    );
  }

  return (
    <div style={S.side}>
      <div style={{ fontSize: 19, fontWeight: 700, color: "var(--farve-moerk)" }}>{firma.navn}</div>
      <h1 style={S.h1}>Bliv ringet op</h1>
      <p style={{ margin: "0 0 18px" }}>
        Skriv dit navn og telefonnummer. Så ringer vi til dig og fortæller, hvordan det foregår.
        Det er gratis og forpligter ikke.
      </p>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 19, marginBottom: 8 }}>Vil du hellere ringe selv?</div>
        <RingSelv />
      </div>

      {(resultat === "travlt" || resultat === "fejl") && (
        <div role="alert" style={{ ...S.kort, border: "3px solid #B00020" }}>
          <b>Beskeden blev ikke sendt.</b>
          <p style={{ margin: "8px 0 14px" }}>
            {resultat === "travlt"
              ? "Lige nu kan vi ikke tage imod flere beskeder her."
              : "Der skete en fejl. Det er ikke din skyld."}{" "}
            Ring til os i stedet, så hjælper vi dig.
          </p>
          <RingSelv />
        </div>
      )}

      <form onSubmit={send} noValidate>
        <div style={S.kort}>
          <label htmlFor="navn" style={S.label}>Dit navn</label>
          <input id="navn" ref={navnRef} value={navn} onChange={(e) => setNavn(e.target.value)}
            autoComplete="name" maxLength={120} aria-invalid={!!fejl.navn}
            style={{ ...S.felt, ...(fejl.navn ? S.feltFejl : null) }} />
          {fejl.navn && <div style={S.fejl}>{fejl.navn}</div>}

          <label htmlFor="tlf" style={{ ...S.label, marginTop: 22 }}>Dit telefonnummer</label>
          <input id="tlf" ref={telRef} value={telefon} onChange={(e) => setTelefon(e.target.value)}
            type="tel" inputMode="tel" autoComplete="tel" maxLength={30} aria-invalid={!!fejl.telefon}
            placeholder="12 34 56 78"
            style={{ ...S.felt, ...(fejl.telefon ? S.feltFejl : null), letterSpacing: ".04em" }} />
          {fejl.telefon && <div style={S.fejl}>{fejl.telefon}</div>}

          {/* Honningkrukke: skjult for mennesker og skærmlæsere, men robotter udfylder den. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label>Hjemmeside <input tabIndex={-1} autoComplete="off" value={hjemmeside}
              onChange={(e) => setHjemmeside(e.target.value)} /></label>
          </div>
        </div>

        <div style={S.kort}>
          <div style={S.label}>Hvornår må vi ringe?</div>
          <div style={S.valgRaekke} role="radiogroup">
            {[["formiddag", "Om formiddagen"], ["eftermiddag", "Om eftermiddagen"], ["lige_meget", "Det er lige meget"]].map(([v, t]) => (
              <Valg key={v} aktiv={ringTid === v} onClick={() => setRingTid(v)}>{t}</Valg>
            ))}
          </div>
        </div>

        <div style={S.kort}>
          <div style={S.label}>
            Får du hjælp til rengøring fra kommunen? <span style={S.valgfri}>(kan springes over)</span>
          </div>
          <div style={S.valgRaekke} role="radiogroup">
            {[["ja", "Ja"], ["nej", "Nej"], ["ved_ikke", "Ved ikke"]].map(([v, t]) => (
              <Valg key={v} aktiv={kommune === v} onClick={() => setKommune(kommune === v ? "" : v)}>{t}</Valg>
            ))}
          </div>
        </div>

        <div style={S.kort}>
          <div style={S.label}>
            Hvad vil du gerne have hjælp til? <span style={S.valgfri}>(kan springes over)</span>
          </div>
          <div style={{ fontSize: 19, marginBottom: 12 }}>Du må gerne vælge flere.</div>
          <div style={S.valgRaekke}>
            {ONSKER.map(([v, t]) => (
              <Valg key={v} flere aktiv={oensker.includes(v)} onClick={() => skift(v)}>{t}</Valg>
            ))}
          </div>
        </div>

        <div style={S.kort}>
          <label htmlFor="adr" style={S.label}>
            Din adresse <span style={S.valgfri}>(kan springes over)</span>
          </label>
          <input id="adr" value={adresse} onChange={(e) => setAdresse(e.target.value)}
            autoComplete="street-address" maxLength={200} placeholder="Vej, nummer og by" style={S.felt} />

          <label htmlFor="besked" style={{ ...S.label, marginTop: 22 }}>
            Vil du fortælle os mere? <span style={S.valgfri}>(kan springes over)</span>
          </label>
          <textarea id="besked" value={besked} onChange={(e) => setBesked(e.target.value)} maxLength={1500}
            rows={4} style={{ ...S.felt, minHeight: 130, resize: "vertical", fontFamily: "inherit" }} />
        </div>

        <button type="submit" disabled={sender} style={{ ...S.knap, opacity: sender ? 0.6 : 1 }}>
          {sender ? "Sender…" : "Ring mig op"}
        </button>

        <details style={{ marginTop: 22, fontSize: 18 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 44, display: "flex", alignItems: "center" }}>
            Hvad bruger I mine oplysninger til?
          </summary>
          <p style={{ margin: "10px 0" }}>
            Kun til at ringe dig op og hjælpe dig. {firma.juridisk_navn || firma.navn} er ansvarlig for oplysningerne.
            Vi gemmer det, du skriver her, og ikke andet — heller ikke noget om din telefon.
          </p>
          <p style={{ margin: "10px 0" }}>
            Bliver du ikke kunde, sletter vi oplysningerne senest et år efter. Vil du have dem slettet før,
            så ring til os på {visNummer(tlf)}.
          </p>
        </details>
      </form>
    </div>
  );
}
