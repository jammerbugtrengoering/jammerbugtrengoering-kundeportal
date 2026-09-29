import Tilbud from "./Tilbud.jsx";
import Portal from "./Portal.jsx";
import { F } from "./stil.js";
import { db } from "./db.js";
import { useEffect } from "react";
import { useFirma, KUNDEUDGAVE } from "./firma.js";

// To helt forskellige sider i samme app:
//
//   /tilbud/<nøgle>   Et åbent link uden login. Adgangen ER nøglen i adressen.
//   /<kortnavn>       Kundeportalen. Kræver login, og alt er afgrænset i databasen.
//
// Der er ingen router som bibliotek. Der er to veje, og et bibliotek til to veje er
// mere at holde styr på end det sparer.

function Ramme({ children, fod }) {
  // Navnet oeverst er firmaets (Opsaetning -> Firma i planlaegningsappen).
  const firma = useFirma(db);
  // «Kundeportal» foerst (29.9.2026, Jonn): med kun firmanavnet oeverst troede man, man
  // var inde i Jammerbugt Rengoerings egen side og ikke i sin egen portal.
  useEffect(() => { document.title = `Kundeportal · ${firma.navn}`; }, [firma.navn]);
  return (
    <div style={F.side}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--farve)", lineHeight: 1.2 }}>Kundeportal</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#64748B", marginTop: 2 }}>hos {firma.navn}</div>
      </div>
      {children}
      <div style={{ ...F.hint, textAlign: "center", marginTop: 24 }}>{fod}</div>
    </div>
  );
}

export default function App() {
  const sti = window.location.pathname;

  // Tilbudssiden har sin egen ramme indeni og skal ikke pakkes ind igen.
  if (/^\/tilbud\//.test(sti)) return <Tilbud />;

  // Der er ingen aaben tilmelding (Jonn 29.9.2026). Kundeloesningen aktiveres fra
  // kundekortet hos Jammerbugt Rengoering, og administratoren faar et link på mail.
  // /opret fanges her, saa den gamle adresse ikke ender som et kortnavn.
  if (KUNDEUDGAVE && /^\/opret\/?$/.test(sti)) {
    return (
      <div style={F.side}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--farve)", marginBottom: 12 }}>Planlægning</div>
        <div style={{ ...F.kort, fontSize: 14.5, color: "#475569", lineHeight: 1.6 }}>
          Planlægning og Worklist oprettes af Jammerbugt Rengøring. Har I fået en mail med et
          link, så brug det. Ellers kontakt Jammerbugt Rengøring.
        </div>
      </div>
    );
  }

  // Kortnavnet er første led i adressen. Små bogstaver, tal og bindestreg — det er
  // også det planlæggeren kan skrive når portalen tændes.
  const slug = (sti.match(/^\/([a-z0-9-]+)\/?$/) || [])[1] || "";

  // Ogsaa uden kortnavn mountes portalen. Roden var foer en blindgyde: landede man
  // her med en gyldig session — fx fra et link uden kortnavn — fik man en
  // velkomsttekst og troede at login'et var mislykkedes. Nu vises kundens egen side,
  // og er man ikke logget ind, staar login-feltet der bare uden kundens navn paa.
  return (
    <Ramme fod="Spørgsmål? Ring til kontoret, så tager vi den derfra.">
      <Portal slug={slug} />
    </Ramme>
  );
}
