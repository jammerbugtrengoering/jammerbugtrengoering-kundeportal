// Fælles udseende og formatering for begge sider i portalen.
//
// Tilbudssiden og kundeportalen er to helt forskellige ting — den ene er et åbent link
// uden login, den anden kræver konto — men kunden skal opleve dem som ét hus. Ligger
// stilen to steder, driver de fra hinanden uden at nogen opdager det.

export const F = {
  // clamp i stedet for mediesporgsmaal: stilen ligger i JavaScript-objekter, og et
  // mediesporgsmaal kan ikke skrives inline. clamp() kan, og den skalerer bloedt i
  // stedet for at hoppe ved en enkelt braekgraense.
  side: { maxWidth: 640, margin: "0 auto",
          padding: "clamp(14px, 4vw, 24px) clamp(12px, 3.5vw, 18px) 60px" },
  kort: {
    background: "#fff", borderRadius: 14, marginBottom: 14,
    padding: "clamp(14px, 4vw, 20px) clamp(14px, 4.5vw, 22px)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.07)",
  },
  maerkat: {
    fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
    color: "#9C1B5D", marginBottom: 8,
  },
  raekke: {
    display: "flex", justifyContent: "space-between", gap: 12,
    padding: "8px 0", borderBottom: "1px solid #F1F5F9", fontSize: 14.5,
  },
  knap: {
    width: "100%", padding: "15px 0", borderRadius: 12, border: "none",
    background: "#D6247A", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
  },
  knap2: {
    width: "100%", padding: "13px 0", borderRadius: 12, border: "1.5px solid #E2E8F0",
    background: "#fff", color: "#334155", fontSize: 15, fontWeight: 600, cursor: "pointer",
    display: "block", textAlign: "center", textDecoration: "none",
  },
  // 16 px er ikke en smagssag: er skriften mindre, zoomer Safari på iPhone ind på
  // feltet når man rører det, og siden hopper.
  felt: {
    width: "100%", padding: "13px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0",
    fontSize: 16, background: "#fff", color: "#111111", boxSizing: "border-box",
  },
  hint: { fontSize: 12.5, color: "#64748B", lineHeight: 1.55, marginTop: 8 },
  // Seks faner kan ikke staa paa én linje paa en telefon. De ombryder til to raekker
  // i stedet for at skulle rulles vandret — en fane, man ikke kan se, findes ikke for
  // den, der leder efter den. flexBasis holder tre pr. raekke paa en smal skaerm.
  // "1 0 88px" og ikke en procentdel: 88 px er den bredde, «Fakturaer» skal bruge, og
  // uden krympning kan en fane aldrig blive smallere end sin tekst. De vokser og
  // fylder linjen ud, naar der er plads til alle seks — og ombryder foerst, naar der
  // ikke er. Paa en telefon giver det tre og tre, paa en computer én raekke.
  //
  // En procentbaseret basis virkede paa telefonen og braekkede paa computeren:
  // seks faner à 28 % er 168 % og ombryder altid, uanset hvor bred skaermen er.
  fane: {
    flex: "1 0 88px", padding: "11px 4px", borderRadius: 10, border: "none",
    background: "transparent", color: "#64748B", fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", minHeight: 44, whiteSpace: "nowrap",
  },
  faneAktiv: { background: "#fff", color: "#9C1B5D", boxShadow: "0 1px 3px rgba(15,23,42,0.10)" },
};

export const kr = (n) => new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(n) || 0) + " kr";

export const dato = (d) => (d
  ? new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })
  : "");

export const datoKort = (d) => (d
  ? new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })
  : "");

// Timer og minutter, ikke decimaltimer. "1 t 45 min" læses rigtigt første gang;
// "1,75 time" skal regnes om i hovedet.
export function tid(minutter) {
  const m = Math.max(0, Math.round(Number(minutter) || 0));
  const t = Math.floor(m / 60);
  const r = m % 60;
  if (!t) return `${r} min`;
  if (!r) return `${t} t`;
  return `${t} t ${r} min`;
}
