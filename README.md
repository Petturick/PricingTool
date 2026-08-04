# Engels Group Prijsmonitoring

Professioneel prijsmonitoring- en concurrentiedashboard voor Engels Group, gebouwd met Next.js 16, Prisma 7 en PostgreSQL.

## Functionaliteit

- **Dashboard** met live KPI's, grootste prijsbewegingen en mislukte controles
- **Productoverzicht** met zoeken, sorteren, paginering en exportmogelijkheden
- **Productdetailpagina** met prijshistorie-grafiek en concurrentieaanbiedingen
- **Concurrentenoverzicht** per land/markt
- **Productmatch-beheer** – goedkeuren, aanpassen of afwijzen van matches
- **Import wizard** voor Prisync CSV- en XLSX-exports met kolomkoppeling
- **Waarschuwingen** voor prijsafwijkingen, voorraadproblemen en verouderde data
- **Rapportages** – wekelijkse managementsamenvatting, exporteerbaar naar CSV/XLSX
- **Beheerschermen** voor landen, concurrenten, productgroepen, webshops, gebruikers en auditlog

### Ondersteunde landen

| Code | Land                      | Valuta | BTW |
|------|---------------------------|--------|-----|
| NL   | Nederland                 | EUR    | 21% |
| BE   | België                    | EUR    | 21% |
| FR   | Frankrijk                 | EUR    | 20% |
| DE   | Duitsland                 | EUR    | 19% |
| PT   | Portugal                  | EUR    | 23% |
| GB   | Verenigd Koninkrijk       | GBP    | 20% |
| ES   | Spanje *(voorbereid)*     | EUR    | 21% |
| DK   | Denemarken *(voorbereid)* | DKK    | 25% |

### Productgroepen

Kunststof bakken, Pallets, Palletboxen, Afvalcontainers, Lekbakken, Stellingen, Transportkoffers, EXOcase, Smartcase, Flightcases, Rack cases.

---

## Installatie

### Vereisten

- Node.js 20 of hoger
- npm 10 of hoger

### Stappen

```bash
# 1. Kloon de repository
git clone <repository-url>
cd PricingTool

# 2. Installeer afhankelijkheden
npm install

# 3. Kopieer het omgevingsbestand
cp .env.example .env

# 4. Pas .env aan (zie configuratie hieronder)

# 5. Maak de database aan en voer migraties uit
npx prisma migrate deploy

# 6. Laad voorbeeldgegevens
npx prisma db seed

# 7. Start de ontwikkelserver
npm run dev
```

De productieomgeving staat op [https://pricingtool.bolt.host/](https://pricingtool.bolt.host/). Voor lokale ontwikkeling opent u `http://localhost:3000`.

---

## Configuratie

Kopieer `.env.example` naar `.env` en vul de volgende variabelen in:

```env
# Bolt PostgreSQL-verbinding, uitsluitend instellen als geheim in Bolt
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

# Willekeurige geheime sleutel voor sessies, minimaal 32 tekens
AUTH_SECRET="change-this-to-a-random-secret"

# Eén vaste openbare productie-URL
AUTH_URL="https://pricingtool.bolt.host"
NEXTAUTH_URL="https://pricingtool.bolt.host"
NEXT_PUBLIC_APP_URL="https://pricingtool.bolt.host"
```

> **Opmerking:** Sla `.env` nooit op in versiebeheer. Het bestand staat al in `.gitignore`.

---

## Standaard testgebruikers

Na `npx prisma db seed` zijn de volgende gebruikers beschikbaar:

| E-mail                 | Rol          | Wachtwoord     |
|------------------------|--------------|----------------|
| admin@engels.nl        | Beheerder    | Admin1234!     |
| analist@engels.nl      | Analist      | Analist1234!   |
| readonly@engels.nl     | Alleen lezen | Readonly1234!  |

---

## Importformaat

### Prisync CSV / XLSX

Upload een CSV- of XLSX-export uit Prisync via **Import** in het menu. De wizard vraagt u de volgende kolommen te koppelen:

| Veld in wizard         | Betekenis                              |
|------------------------|----------------------------------------|
| Artikelnummer          | Engels intern artikelnummer            |
| EAN                    | Barcode (EAN-13 of GTIN)               |
| Productnaam            | Naam van het product                   |
| Productgroep           | Productcategorie                       |
| Land                   | Landcode (NL, BE, FR, ...)             |
| Webshop                | Naam van de webshop                    |
| Engels URL             | URL op de Engels-website               |
| Eigen prijs            | Verkoopprijs van Engels                |
| Eigen voorraad         | Voorraadstatus Engels                  |
| Concurrentnaam         | Naam van de concurrent                 |
| Concurrent URL         | Productpagina concurrent               |
| Concurrentieprijs      | Prijs bij de concurrent                |
| Valuta                 | Valutacode (EUR, GBP, DKK)             |
| Voorraad concurrent    | Voorraadstatus concurrent              |
| Laatste controle       | Datum van laatste prijscontrole        |
| Verpakkingseenheid     | Eenheid (stuk, set, doos, ...)         |

**Regels:**

- Een import overschrijft bestaande gegevens alleen als de nieuwe informatie geldig en recenter is.
- Een foutieve import verwijdert nooit historische prijsgegevens.
- Foutieve rijen worden overgeslagen; het systeem importeert de geldige rijen wel.

---

## Prijsnormalisatie

Alle concurrentieprijzen worden genormaliseerd naar dezelfde grondslag:

1. **BTW** – prijs wordt omgerekend naar inclusief of exclusief BTW op basis van het landtarief.
2. **Valuta** – omgerekend naar EUR (vaste koersen: GBP = 1,17 EUR, DKK = 0,134 EUR).
3. **Verpakkingseenheid** – prijs per eenheid berekend op basis van verpakkingshoeveelheid.

Zowel de oorspronkelijke als de genormaliseerde prijs worden opgeslagen.

---

## Productmatching

Matches worden automatisch berekend op basis van:

| Stap | Criterium                    | Score  |
|------|------------------------------|--------|
| 1    | Exacte EAN/GTIN              | 100    |
| 2    | Exacte SKU/artikelnummer     | 95     |
| 3    | Afmetingen in producttitel   | +20    |
| 4    | Overeenkomende naam-tokens   | 0–50   |
| 5    | Verpakkingseenheid           | +15    |
| 6    | Verpakkingshoeveelheid       | +15    |

**Statussen:**

| Status              | Score  | Gebruik                              |
|---------------------|--------|--------------------------------------|
| Vrijwel zeker       | ≥ 95   | Automatisch goedgekeurd              |
| Handmatige controle | 80–94  | Zichtbaar voor beoordeling           |
| Onbetrouwbaar       | < 80   | Nooit gebruikt voor advies/rapport   |

---

## Geplande prijscontroles

De automatische prijscontrole is ontworpen als modulaire service. Voor productie koppelt u een taakplanner (cron of wachtrij-service) aan het API-endpoint `/api/prijscontroles`.

Richtlijnen:

- Respecteer robots.txt van elke webshop.
- Stel een redelijke controlefrequentie in per concurrent (standaard 24 uur).
- Een mislukte controle overschrijft nooit de laatste geldige prijs.

---

## Scripts

| Commando                     | Beschrijving                          |
|------------------------------|---------------------------------------|
| `npm run dev`                | Start de ontwikkelserver              |
| `npm run build`              | Bouw de productieversie               |
| `npm run start`              | Start de productieserver              |
| `npm run lint`               | Controleer code op stijlfouten        |
| `npx prisma migrate dev`     | Maak en voer een nieuwe migratie uit  |
| `npx prisma migrate deploy`  | Voer migraties uit (productie)        |
| `npx prisma db seed`         | Laad voorbeeldgegevens                |
| `npx prisma studio`          | Open de visuele database-editor       |

---

## Architectuur

```
src/
  app/                     # Next.js App Router pagina's en API-routes
    actions/               # Server Actions (import, matches, alerts, rapportages, beheer)
    api/                   # Route Handlers (REST API)
    beheer/                # Beheerschermen
    concurrenten/          # Concurrentenoverzicht en detail
    dashboard/             # Dashboard met KPI's
    import/                # Import wizard
    producten/             # Productoverzicht en detail
    productmatches/        # Matchbeoordeling
    rapportages/           # Weekrapportages
    waarschuwingen/        # Waarschuwingsoverzicht
  components/              # Herbruikbare React-componenten
  generated/               # Prisma-gegenereerde clientcode (niet bewerken)
  lib/                     # Gedeelde utilities
    audit.ts               # Auditlog helpers
    dashboard.ts           # Dashboard data queries
    format.ts              # Getal/datum formattering
    import-parser.ts       # CSV/XLSX parser
    price-normalization.ts # Prijsnormalisatie
    prisma.ts              # Prisma singleton
    product-matching.ts    # Matchalgoritme
    validators.ts          # Zod validators
prisma/
  schema.prisma            # Datamodel
  migrations/              # Databasemigraties
  seed.ts                  # Voorbeeldgegevens
```

**Technologiestack:**

| Onderdeel       | Technologie                        |
|-----------------|------------------------------------|
| Framework       | Next.js 16 (App Router)            |
| Taal            | TypeScript                         |
| Database        | PostgreSQL via Prisma 7            |
| Styling         | Tailwind CSS 4                     |
| Grafieken       | Recharts                           |
| Validatie       | Zod 4                              |
| Beveiliging     | bcryptjs                           |
| CSV-parsing     | csv-parse                          |
| XLSX-verwerking | read-excel-file / write-excel-file |

---

## Beveiliging

- Alle invoer wordt server-side gevalideerd met Zod.
- Wachtwoorden worden opgeslagen als bcrypt-hash.
- Geheimen staan uitsluitend in omgevingsvariabelen.
- Importen overschrijven nooit historische data.
- Er worden nooit automatisch prijzen gewijzigd in externe systemen.
- Beheerfuncties vereisen autorisatie per rol (ADMIN / ANALYST / READONLY).

---

## Licentie

Intern gebruik – Engels Group.
