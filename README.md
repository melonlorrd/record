# Kosh (कोश) — Offline-First Personal Money Tracker

Kosh is an offline-first, private personal money tracker built as an installable Progressive Web App (PWA). It runs 100% on-device in the browser using IndexedDB, requires zero backend services, and is deployed as a static site to Cloudflare Pages.

---

## Architecture & Go Developer Mental Model

If you come from **Go**, TypeScript web development has a few notable differences and pitfalls. This codebase is explicitly typed with strict compile checks (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, and zero `any`).

Here is a quick cheat sheet of how TypeScript concepts in this codebase map to Go:

| Go Concept | TypeScript / Kosh Implementation | Why / Pitfall Handled |
| :--- | :--- | :--- |
| `type Entry struct { ... }` with struct tags / validation | Zod Schema (`EntrySchema`) + `z.infer<typeof EntrySchema>` | In TS, compile-time types vanish at runtime. Zod validates data at the boundary (IndexedDB, JSON import) and automatically generates matching TS types. |
| `val, ok := map[key]` comma-ok check | `noUncheckedIndexedAccess: true` | In standard JS, indexing an array `arr[i]` or object `obj[k]` returns `undefined` silently if missing. With this flag enabled, TS forces explicit `if (item !== undefined)` handling just like Go. |
| IEEE 754 float precision (currency) | `amountCents: number` (Integer paise) | Never store currency as floats (`0.1 + 0.2 = 0.30000000000000004`). In Kosh, ₹100.50 is strictly `10050` integer cents. Currency parsing separates integer rupees from paise. |
| Pointer / nil vs Zero-value struct | `exactOptionalPropertyTypes: true` | In TS, `{ field?: string }` can be omitted, but cannot be assigned arbitrary nulls unless explicitly declared as `string \| undefined`. |
| `time.Time.In(loc).Hour()` | Native `Intl.DateTimeFormat` with `{ timeZone: entry.tz }` | Standard JS `Date` is milliseconds since epoch. To calculate hour/weekday heatmaps across multiple timezones, Kosh uses native `Intl` parts extraction without external date libraries. |
| Value copying `e2 := e1` | Spread copies `{ ...entry, updatedAt: now }` | JS objects are references. Domain helpers always return new immutable objects using spread syntax. |
| Go interfaces / tagged unions | Discriminated unions (`kind: 'expense' \| 'income'`) | Type-narrowing works like Go type switches: checking `if (entry.kind === 'expense')` narrows available properties. |

---

## Local Development (Nix & Flakes)

Local development uses Nix Flakes to provide an isolated environment with **Node.js 22 LTS**, **pnpm**, **Git**, and **cloudflared**. Node and npm do **not** need to be installed globally on your machine. Nix is for local dev only and is never required to build or deploy the project.

### 1. Enter the Nix DevShell
```bash
# If using direnv, allow it once:
direnv allow

# Or enter the dev shell directly:
nix develop
```

### 2. Available Commands (Inside `nix develop`)
```bash
# Install dependencies
pnpm install

# Start local development server with Hot Module Replacement (HMR)
pnpm dev

# Run Vitest headless unit tests (domain logic, analytics, seed, Zod schemas)
pnpm test

# Build production bundle (TypeScript type-check + Vite build)
pnpm build

# Preview production build locally on http://localhost:4173
pnpm preview
```

---

## Testing Install to iPhone (PWA)

PWAs require **HTTPS** and a valid Web App Manifest with icons to trigger the native installation prompt. You can test on your physical iPhone using either the Cloudflare Pages URL or a local tunnel.

### Option A: Via Local `cloudflared` Tunnel (Zero Deploy)
1. In your first terminal (inside `nix develop`), build and preview the app:
   ```bash
   pnpm build && pnpm preview --port 4173
   ```
2. In a second terminal (inside `nix develop`), start an ephemeral tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:4173
   ```
3. Cloudflare will print a public HTTPS URL (e.g. `https://xxxx-xxxx.trycloudflare.com`).
4. On your **iPhone**:
   - Open **Safari** (Chrome on iOS does not support full PWA Home Screen installation).
   - Navigate to the `trycloudflare.com` URL.
   - Tap the **Share** button (box with upward arrow at the bottom).
   - Scroll down and tap **Add to Home Screen**.
   - Tap **Add**. Kosh will now launch full-screen with offline capabilities and its own app icon.

### Option B: Via Cloudflare Pages URL
Deploy to Pages (instructions below) and open your `https://<project>.pages.dev` URL in Safari on iPhone, then tap **Share > Add to Home Screen**.

---

## Cloudflare Pages Deployment (Git-Connected)

The app is completely static (no server functions or SSR required) and compiles to standard HTML/JS/CSS in the `dist` directory.

### Step-by-Step Setup:
1. Push your repository to **GitHub** (or GitLab).
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages > Create > Pages > Connect to Git**.
3. Select your repository.
4. Set the build configuration:
   - **Framework preset**: `Vite` (or `None`)
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
5. Under **Environment variables**, set:
   - `NODE_VERSION`: `22` (matching `.node-version`)
   - `PNPM_VERSION`: `12.9.0` (or `latest`)
6. Click **Save and Deploy**.

### Cache Headers (`public/_headers`)
Cloudflare Pages automatically reads the included `public/_headers` file:
- `/sw.js`, `/manifest.webmanifest`, and `/index.html` are served with `Cache-Control: no-cache, no-store, must-revalidate` so app updates and manifests are immediately detected.
- Hashed assets under `/assets/*` are served with `Cache-Control: public, max-age=31536000, immutable` for performance.

### PWA Update Flow
When a new version is pushed to Cloudflare Pages, `vite-plugin-pwa` registers the update and displays a clean banner:
> *"🚀 A new version of Kosh is available! [Update & Reload]"*

Tapping **Update & Reload** triggers `updateServiceWorker(true)`, refreshing the cache gracefully without silently swapping state mid-session.

---

## Data Model & Offline Storage

- **Persistence**: Stored in IndexedDB via `idb-keyval` under the key `kosh_money_tracker_data_v1`.
- **Atomic Writes**: State is maintained in memory as arrays. Every create, update, or soft-delete writes the entire validated dataset in a single atomic record.
- **Fail-Safe Loading**: On boot, the data is validated against `AppDataSchema` with Zod. If the data is corrupted or invalid, Kosh **fails safely** without overwriting the stored data, preserving user records.
- **Storage Persistence**: Requests `navigator.storage.persist()` on boot to protect IndexedDB from browser eviction under storage pressure.
- **Backup & Restore**: In **Settings**, you can export a full JSON backup file or restore from one with strict validation.
- **Sample Data**: Tapping **Reset to Sample Data** runs a deterministic pseudo-random generator with a fixed seed, populating ~4 months of realistic habits (salary, rent, chai breaks, weekend outings, subscriptions, impulse buys, and no-spend days).
