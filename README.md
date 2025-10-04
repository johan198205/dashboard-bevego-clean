# Mitt Riksbyggen – Mock Analytics Dashboard

All data in this app is mock. The UI and resolver are structured so each widget can later be switched from mock to GA4 by editing a single place.

## Snabbstart

1. Kopiera `.env.local.example` till `.env.local` och behåll:

```
TZ=Europe/Stockholm
```

2. Kör utvecklingsservern:

```
npm run dev
```

## Arkitektur

- `src/lib/types.ts` – Normaliserat kontrakt (`KpiResponse`, `KpiPoint`, `Diff`, m.m.)
- `src/lib/resolver.ts` – EN ingång: `getKpi(params)`. Idag mockar alla mått.
  - CONNECT GA4 HERE LATER: byt implementation per `metric` och returnera samma `KpiResponse`.
- `src/lib/mockData/` – Fixtures och generatorer för realistiska tidsserier och brytningar.
- `src/components/GlobalFilters.tsx` – Enkel filter-context som påverkar frågorna (lokalt).
- `src/widgets/*` – Typade komponenter som anropar `getKpi` och visar badges/tooltips.

## Byta en widget till GA4 senare

1. Gå till `src/lib/resolver.ts`, lokalisera grenen för metrik (t.ex. `metric === "mau"`).
2. Ersätt mock-generatorn med anrop till GA4-provider.
3. Mappa svaret till `KpiResponse` (behåll samma fält). Inga widgetändringar behövs.

## Sidor

- `/` (Översikt) – MAU, Sidvisningar, Tasks/Features, NDI, Prestanda.
- `/anvandare` – MAU-trend, kanal-/målgruppstabell (mockad breakdown).
- `/anvandning` – Sidvisningar + Tasks/Features-tabeller.
- `/konverteringar` – scaffold/tratt.
- `/kundnojdhet` – NDI trend + placeholder heatmap/tabell.
- `/prestanda` – placeholders (svarstid, uptime, WCAG).
- `/installningar` – Käll-toggle (Mock), event-taxonomi och redigerbar `microfrontends.json` lista.

## Språk & format

- Svenska etiketter, datum/nummer formateras som `sv-SE`. Tidszon `Europe/Stockholm`.

# NextAdmin - Next.js Admin Dashboard Template and Components

**NextAdmin** is a Free, open-source Next.js admin dashboard toolkit featuring 200+ UI components and templates that come with pre-built elements, components, pages, high-quality design, integrations, and much more to help you create powerful admin dashboards with ease.


[![nextjs admin template](https://cdn.pimjo.com/nextadmin-2.png)](https://nextadmin.co/)


**NextAdmin** provides you with a diverse set of dashboard UI components, elements, examples and pages necessary for creating top-notch admin panels or dashboards with **powerful** features and integrations. Whether you are working on a complex web application or a basic website, **NextAdmin** has got you covered.

### [✨ Visit Website](https://nextadmin.co/)
### [🚀 Live Demo](https://demo.nextadmin.co/)
### [📖 Docs](https://docs.nextadmin.co/)

By leveraging the latest features of **Next.js 14** and key functionalities like **server-side rendering (SSR)**, **static site generation (SSG)**, and seamless **API route integration**, **NextAdmin** ensures optimal performance. With the added benefits of **React 18 advancements** and **TypeScript** reliability, **NextAdmin** is the ultimate choice to kickstart your **Next.js** project efficiently.

## Installation

1. Download/fork/clone the repo and Once you're in the correct directory, it's time to install all the necessary dependencies. You can do this by typing the following command:

```
npm install
```
If you're using **Yarn** as your package manager, the command will be:

```
yarn install
```

2. Okay, you're almost there. Now all you need to do is start the development server. If you're using **npm**, the command is:

```
npm run dev
```
And if you're using **Yarn**, it's:

```
yarn dev
```

And voila! You're now ready to start developing. **Happy coding**!

## Highlighted Features
**200+ Next.js Dashboard Ul Components and Templates** - includes a variety of prebuilt **Ul elements, components, pages, and examples** crafted with a high-quality design.
Additionally, features seamless **essential integrations and extensive functionalities**.

- A library of over **200** professional dashboard UI components and elements.
- Five distinctive dashboard variations, catering to diverse use-cases.
- A comprehensive set of essential dashboard and admin pages.
- More than **45** **Next.js** files, ready for use.
- Styling facilitated by **Tailwind CSS** files.
- A design that resonates premium quality and high aesthetics.
- A handy UI kit with assets.
- Over ten web apps complete with examples.
- Support for both **dark mode** and **light mode**.
- Essential integrations including - Authentication (**NextAuth**), Database (**Postgres** with **Prisma**), and Search (**Algolia**).
- Detailed and user-friendly documentation.
- Customizable plugins and add-ons.
- **TypeScript** compatibility.
- Plus, much more!

All these features and more make **NextAdmin** a robust, well-rounded solution for all your dashboard development needs.

## Update Logs

### Version 1.2.1 - [Mar 20, 2025]
- Fix Peer dependency issues and NextConfig warning.
- Updated apexcharts and react-apexhcarts to the latest version.

### Version 1.2.0 - Major Upgrade and UI Improvements - [Jan 27, 2025]

- Upgraded to Next.js v15 and updated dependencies
- API integration with loading skeleton for tables and charts.
- Improved code structure for better readability.
- Rebuilt components like dropdown, sidebar, and all ui-elements using accessibility practices.
- Using search-params to store dropdown selection and refetch data.
- Semantic markups, better separation of concerns and more.

### Version 1.1.0
- Updated Dependencies
- Removed Unused Integrations
- Optimized App

### Version 1.0
- Initial Release - [May 13, 2024]

## Docker

Bygg och kör med Docker:

```bash
# Build image
docker build -t dashboard-mittriks:local .
# Run
docker run --rm -p 3000:3000 dashboard-mittriks:local
```

### Docker Compose

```bash
docker compose up --build
```
