# Kundeportalen — læs det her, før du retter noget

Den her app bruges af **kunderne**, ikke af firmaet. Den, der sidder i den, er en
institutionsleder eller en privatkunde, som bruger den nogle gange om året — ikke hver
dag. Der er ingen, der kan spørge kollegaen ved siden af, og der er ingen oplæring. Alt,
der kræver, at man kan huske noget fra sidst, virker ikke her.

Det her er den eneste fil, en Claude læser af sig selv. Den lange baggrund ligger i
`Planning-App/overdragelse/` — et **andet repository**, som ikke nødvendigvis er hentet
ned på den maskine, du sidder ved.

Appen er i drift. Netlify lægger ud, så snart der er pushet.

---

## Det, der er særligt her

**Login er en engangskode på mail**, ikke en adgangskode. Kunden skal ikke oprette noget
og skal ikke huske noget. Funktionen hedder `portal-login`. Bliver den lavet om, er det
kundens eneste vej ind — der er ikke en bagdør.

**Portalen taler med tre edge-funktioner:** `portal-login`, `bestilling-besked` (besked
til kontoret, når en kunde bestiller) og `dinero`. De ligger i Supabase, ikke i det her
repository, og rettes derinde.

**Bestillinger bliver til rigtige opgaver.** Det, kunden skriver i fritekstfeltet, er det
eneste sted kundens egne ord står. Planlæggeren ser dem i opgaven. Bliver feltet skåret
væk eller forkortet, skal nogen tilbage i portalen for at se, hvad der egentlig blev
bestilt.

**Databasen er den samme som de to andre apps.** En ændring her kan ramme
planlægningsappen og Worklist. Portalen læser gennem RLS-regler, der er sat op til, at en
kunde kun ser sit eget — dem skal man være varsom med.

---

## Privatlivsteksten

Hjælpens afsnit **«Sådan behandler vi jeres oplysninger»** i `src/Portal.jsx` er én af
fire udgaver af den samme sandhed. De andre står i Worklist (dansk og engelsk), i
planlægningsappen og i `Fortegnelse-behandlingsaktiviteter.docx`.

Begynder databasen at gemme noget nyt om en kunde eller en borger, skal **alle fire**
rettes. Det er ikke den samme tekst fire gange — det er fire forskellige læsere, der skal
have de samme fakta.

Den fælles kilde er tabellen `persondata_register` i databasen. Morgentjekket melder, hvis
der er kommet et felt til, som ingen har taget stilling til.

---

## Når I er flere om det samme repository

**Sæt de her én gang på hver maskine:**

    git config --global pull.rebase false
    git config --global user.name "Fornavn Efternavn"
    git config --global user.email "din@adresse.dk"

Uden den første siger git *«You have divergent branches»* og **gør ingenting**. Uden de to
andre står der «Dit Navn» i historikken.

Bliver et push afvist med `(fetch first)`, har den anden pushet imens:

    git pull --no-rebase --no-edit origin main
    git push origin main

Kommer der **CONFLICT**, så stop. Brug aldrig `--force`. `git merge --abort` sætter dig
tilbage.

---

## Faste ting

- **Hjælpen skal opdateres, når funktionalitet ændres.** En hjælpetekst, der ikke længere
  passer, er værre end ingen — og her er hjælpen det eneste, kunden har.
- **Kommentarer forklarer hvorfor, ikke hvad** — og gerne hvilken fejl der ligger bag.
- Skriv til en, der bruger siden to gange om året. Ingen forkortelser, ingen fagudtryk fra
  planlægningen, og ingen knap, hvis navn kun giver mening, hvis man kender systemet.

## Før du melder noget færdigt

    npm run build

Den kører `oxlint` først og bygger ikke, hvis den fejler.

Claude kan ikke nå GitHub. **Claude retter og committer, brugeren pusher.** Slut svaret af
med kommandoen:

    cd ~/planapp/jammerbugtrengoering-kundeportal && git push origin main
