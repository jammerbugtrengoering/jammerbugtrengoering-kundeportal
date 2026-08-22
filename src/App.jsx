import { useEffect, useState } from "react";

// Kundens vej ind til sit eget tilbud.
//
// Der er ingen konto og ingen adgangskode: adgangen ER den lange tilfaeldige noegle i
// linket. Derfor er der heller ingen Supabase-klient og ingen anon-noegle i det her
// bundt — alt gaar gennem edge-funktionen tilbud-offentlig, som er den eneste der
// kan naa tabellen. En kunde kan altsaa ikke sidde og afproeve noegler mod databasen.
const FUNKTION = "https://gteowfoahsfpunzgdxum.supabase.co/functions/v1/tilbud-offentlig";

const KONTRAKT = {
  privat: "Privat", erhverv: "Erhverv", aeldrelov: "Ældreloven", nexus: "Kommunal (Nexus)",
};
const INTERVAL = {
  uge: "Hver uge", "14_dage": "Hver 14. dag", maaned: "Hver måned",
};

const kr = (n) => new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(n) || 0) + " kr";

const dato = (d) => d ? new Date(d).toLocaleDateString("da-DK",
  { day: "numeric", month: "long", year: "numeric" }) : "";

async function kald(krop) {
  const res = await fetch(FUNKTION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(krop),
  });
  return await res.json();
}

const F = {
  side: { maxWidth: 640, margin: "0 auto", padding: "24px 18px 60px" },
  kort: { background: "#fff", borderRadius: 14, padding: "20px 22px", marginBottom: 14,
          boxShadow: "0 1px 3px rgba(15,23,42,0.07)" },
  maerkat: { fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
             color: "#9C1B5D", marginBottom: 8 },
  raekke: { display: "flex", justifyContent: "space-between", gap: 12,
            padding: "8px 0", borderBottom: "1px solid #F1F5F9", fontSize: 14.5 },
  knap: { width: "100%", padding: "15px 0", borderRadius: 12, border: "none",
          background: "#D6247A", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  knap2: { width: "100%", padding: "13px 0", borderRadius: 12, border: "1.5px solid #E2E8F0",
           background: "#fff", color: "#334155", fontSize: 15, fontWeight: 600, cursor: "pointer",
           display: "block", textAlign: "center", textDecoration: "none" },
  felt: { width: "100%", padding: "13px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0",
          fontSize: 16, background: "#fff", color: "#111111" },
  hint: { fontSize: 12.5, color: "#64748B", lineHeight: 1.55, marginTop: 8 },
};

function Ramme({ children }) {
  return (
    <div style={F.side}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#D6247A" }}>Jammerbugt Rengøring</div>
      </div>
      {children}
      <div style={{ ...F.hint, textAlign: "center", marginTop: 24 }}>
        Spørgsmål til tilbuddet? Ring til kontoret, så tager vi den derfra.
      </div>
    </div>
  );
}

export default function App() {
  // Linket er /tilbud/<noegle>. Ingen router — der findes én side.
  const noegle = (window.location.pathname.match(/\/tilbud\/([^/?#]+)/) || [])[1] || "";

  const [henter, setHenter] = useState(true);
  const [tilbud, setTilbud] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [fejl, setFejl] = useState("");

  const [navn, setNavn] = useState("");
  const [email, setEmail] = useState("");
  const [accepterer, setAccepterer] = useState(false);
  const [accepteret, setAccepteret] = useState(false);

  useEffect(() => {
    if (!noegle) { setHenter(false); setFejl("ukendt"); return; }
    let afbrudt = false;
    (async () => {
      try {
        const svar = await kald({ handling: "hent", noegle });
        if (afbrudt) return;
        if (svar?.error || !svar?.tilbud) { setFejl("ukendt"); }
        else {
          setTilbud(svar.tilbud);
          setPdfUrl(svar.pdfUrl || null);
          if (svar.tilbud.status === "accepteret") setAccepteret(true);
        }
      } catch {
        if (!afbrudt) setFejl("forbindelse");
      }
      if (!afbrudt) setHenter(false);
    })();
    return () => { afbrudt = true; };
  }, [noegle]);

  async function accepter() {
    setFejl("");
    if (!navn.trim()) { setFejl("navn"); return; }
    setAccepterer(true);
    try {
      const svar = await kald({ handling: "accepter", noegle, navn: navn.trim(), email: email.trim() || null });
      setAccepterer(false);
      if (svar?.ok) { setAccepteret(true); return; }
      setFejl(svar?.grund || "ukendt");
    } catch {
      setAccepterer(false);
      setFejl("forbindelse");
    }
  }

  if (henter) {
    return <Ramme><div style={{ ...F.kort, textAlign: "center", color: "#94A3B8" }}>Henter tilbuddet…</div></Ramme>;
  }

  if (fejl === "ukendt" && !tilbud) {
    return (
      <Ramme>
        <div style={F.kort}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Vi kan ikke finde tilbuddet</div>
          <div style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6 }}>
            Linket er måske forkert, eller tilbuddet er trukket tilbage. Ring til kontoret,
            så sender vi et nyt.
          </div>
        </div>
      </Ramme>
    );
  }

  if (accepteret) {
    return (
      <Ramme>
        <div style={{ ...F.kort, textAlign: "center" }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#F0FDF4",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "4px auto 14px", fontSize: 30, color: "#16A34A" }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Tak — tilbuddet er accepteret</div>
          <div style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6, marginTop: 10 }}>
            Vi kontakter dig for at aftale startdato og faste ugedage. Arbejdet begynder
            først når det er på plads.
          </div>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ ...F.knap2, marginTop: 18 }}>
              Hent tilbuddet som PDF
            </a>
          )}
        </div>
      </Ramme>
    );
  }

  const t = tilbud;
  const udloebet = t.status === "udloebet" || (t.gyldigTil && new Date(t.gyldigTil) < new Date().setHours(0, 0, 0, 0));

  return (
    <Ramme>
      <div style={F.kort}>
        <div style={F.maerkat}>Tilbud</div>
        <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3 }}>{t.titel || "Rengøring"}</div>
        <div style={{ fontSize: 14.5, color: "#475569", marginTop: 6 }}>
          {t.kundeNavn}
          {t.adresse ? ` · ${t.adresse}` : ""}
        </div>
        {t.gyldigTil && (
          <div style={{ ...F.hint, marginTop: 10 }}>Gyldigt til og med {dato(t.gyldigTil)}</div>
        )}
      </div>

      <div style={F.kort}>
        <div style={F.maerkat}>Pris</div>
        {t.prisform === "fixed" ? (
          <>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{kr(t.fastPris)}</div>
            <div style={F.hint}>Fast pris pr. besøg, uanset hvor lang tid det tager. Ekskl. moms.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{kr(t.timepris)} <span style={{ fontSize: 15, fontWeight: 500, color: "#64748B" }}>pr. time</span></div>
            {t.anslaaetTimer && (
              <div style={{ fontSize: 14.5, color: "#475569", marginTop: 6 }}>
                Anslået {String(t.anslaaetTimer).replace(".", ",")} timer pr. besøg
                {" — ca. "}{kr(Number(t.anslaaetTimer) * Number(t.timepris || 0))}
              </div>
            )}
            <div style={F.hint}>
              Vi fakturerer kun for den tid der faktisk bliver registreret på opgaven.
              Går det hurtigere, betaler du mindre. Ekskl. moms.
            </div>
          </>
        )}
        <div style={{ ...F.raekke, marginTop: 12, borderTop: "1px solid #F1F5F9" }}>
          <span style={{ color: "#64748B" }}>Kontrakttype</span>
          <strong>{KONTRAKT[t.kontrakttype] || t.kontrakttype}</strong>
        </div>
        {t.interval && (
          <div style={{ ...F.raekke, borderBottom: "none" }}>
            <span style={{ color: "#64748B" }}>Hyppighed</span>
            <strong>{INTERVAL[t.interval] || t.interval}</strong>
          </div>
        )}
      </div>

      {(t.ydelser || []).length > 0 && (
        <div style={F.kort}>
          <div style={F.maerkat}>Det er indeholdt</div>
          {t.ydelser.map((y, i) => (
            <div key={i} style={{ marginBottom: i === t.ydelser.length - 1 ? 0 : 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{y.navn}</div>
              {(y.punkter || []).map((p, j) => (
                <div key={j} style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, paddingLeft: 4 }}>· {p}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {t.referat && (
        <div style={F.kort}>
          <div style={F.maerkat}>Fra vores møde</div>
          <div style={{ fontSize: 14.5, color: "#334155", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{t.referat}</div>
        </div>
      )}

      {t.bemaerkning && (
        <div style={F.kort}>
          <div style={F.maerkat}>Bemærkninger</div>
          <div style={{ fontSize: 14.5, color: "#334155", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{t.bemaerkning}</div>
        </div>
      )}

      {pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ ...F.knap2, marginBottom: 14 }}>
          Læs hele tilbuddet som PDF
        </a>
      )}

      {udloebet ? (
        <div style={{ ...F.kort, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#92400E" }}>Tilbuddet er udløbet</div>
          <div style={{ fontSize: 14, color: "#92400E", lineHeight: 1.6, marginTop: 6 }}>
            Ring til kontoret, så laver vi et nyt med de aktuelle priser.
          </div>
        </div>
      ) : t.status !== "sendt" ? (
        <div style={{ ...F.kort, textAlign: "center", color: "#64748B", fontSize: 14.5 }}>
          Tilbuddet er ikke klar til accept endnu.
        </div>
      ) : (
        <div style={F.kort}>
          <div style={F.maerkat}>Accepter tilbuddet</div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>
            Skriv dit navn og tryk accept. Så er aftalen indgået, og vi kontakter dig
            for at aftale startdato og faste ugedage.
          </div>

          <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 5 }}>
            Dit navn
          </label>
          <input style={F.felt} value={navn} onChange={(e) => setNavn(e.target.value)}
            placeholder="Fornavn og efternavn" autoComplete="name" />

          <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#475569", margin: "12px 0 5px" }}>
            Din e-mail (valgfri)
          </label>
          <input style={F.felt} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="navn@virksomhed.dk" autoComplete="email" inputMode="email" />

          {fejl === "navn" && (
            <div style={{ color: "#B91C1C", fontSize: 13.5, marginTop: 10 }}>Skriv dit navn først.</div>
          )}
          {fejl === "forbindelse" && (
            <div style={{ color: "#B91C1C", fontSize: 13.5, marginTop: 10 }}>
              Der er ingen forbindelse lige nu. Prøv igen om lidt.
            </div>
          )}
          {fejl === "udloebet" && (
            <div style={{ color: "#B45309", fontSize: 13.5, marginTop: 10 }}>
              Tilbuddet er lige udløbet. Ring til kontoret, så laver vi et nyt.
            </div>
          )}
          {fejl && !["navn", "forbindelse", "udloebet"].includes(fejl) && (
            <div style={{ color: "#B91C1C", fontSize: 13.5, marginTop: 10 }}>
              Det kunne ikke gennemføres. Ring til kontoret.
            </div>
          )}

          <button style={{ ...F.knap, marginTop: 16, opacity: accepterer ? 0.6 : 1 }}
            onClick={accepter} disabled={accepterer}>
            {accepterer ? "Sender…" : "Jeg accepterer tilbuddet"}
          </button>

          <div style={F.hint}>
            Når du accepterer, registrerer vi dit navn, tidspunktet og et fingeraftryk af
            netop dette dokument. Det er for at begge parter kan dokumentere hvad der blev
            aftalt — indholdet kan ikke ændres bagefter.
          </div>
        </div>
      )}
    </Ramme>
  );
}
