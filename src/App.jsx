import Tilbud from "./Tilbud.jsx";
import Portal from "./Portal.jsx";
import { F } from "./stil.js";

// To helt forskellige sider i samme app:
//
//   /tilbud/<nøgle>   Et åbent link uden login. Adgangen ER nøglen i adressen.
//   /<kortnavn>       Kundeportalen. Kræver login, og alt er afgrænset i databasen.
//
// Der er ingen router som bibliotek. Der er to veje, og et bibliotek til to veje er
// mere at holde styr på end det sparer.

function Ramme({ children, fod }) {
  return (
    <div style={F.side}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#D6247A" }}>Jammerbugt Rengøring</div>
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

  // Kortnavnet er første led i adressen. Små bogstaver, tal og bindestreg — det er
  // også det planlæggeren kan skrive når portalen tændes.
  const slug = (sti.match(/^\/([a-z0-9-]+)\/?$/) || [])[1] || "";

  if (!slug) {
    return (
      <Ramme fod="Spørgsmål? Ring til kontoret, så tager vi den derfra.">
        <div style={F.kort}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Velkommen</div>
          <div style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6 }}>
            Her åbner du et tilbud fra os, eller logger ind i din kundeportal.
            Brug linket i den mail du har fået — det fører direkte det rigtige sted hen.
          </div>
        </div>
      </Ramme>
    );
  }

  return (
    <Ramme fod="Spørgsmål? Ring til kontoret, så tager vi den derfra.">
      <Portal slug={slug} />
    </Ramme>
  );
}
