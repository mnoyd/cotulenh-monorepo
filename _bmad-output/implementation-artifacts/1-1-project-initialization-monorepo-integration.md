# Story 1.1: Project Initialization & Monorepo Integration

Status: done

## Story

As a developer,
I want the Next.js 15 app scaffolded within the monorepo with all core dependencies and Supabase client infrastructure configured,
So that all subsequent stories have a working foundation to build on.

## Acceptance Criteria

1. **Given** the existing monorepo with pnpm + Turborepo
   **When** the initialization is complete
   **Then** a new Next.js 15 app exists at `apps/cotulenh/web` with TypeScript, Tailwind CSS 4, App Router, and `src/` directory

2. **And** shadcn/ui is initialized with `components.json` configured

3. **And** `@supabase/ssr`, `@supabase/supabase-js`, and `zustand` are installed

4. **And** Turborepo `turbo.json` includes pipeline tasks for the `web` app (dev, build, lint, type-check)

5. **And** Supabase client helpers exist at `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, and `src/lib/supabase/middleware.ts`

6. **And** `.env.local` and `.env.example` are created with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` placeholders

7. **And** `pnpm dev --filter @cotulenh/web` starts the dev server without errors

8. **And** `pnpm build --filter @cotulenh/web` completes successfully

9. **And** a proof-of-concept Edge Function in `supabase/functions/` imports `@cotulenh/core` and runs a basic `game.move()` call to validate Deno compatibility

## Tasks / Subtasks

- [x] Task 1: Scaffold Next.js 15 app (AC: #1)
  - [x] Run `npx create-next-app@latest apps/cotulenh/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [x] Verify `src/` directory structure with App Router
  - [x] Set `<html lang="vi">` in root layout
  - [x] Configure system font stacks in globals.css (no custom fonts)
- [x] Task 2: Initialize shadcn/ui (AC: #2)
  - [x] Run `npx shadcn@latest init` in `apps/cotulenh/web`
  - [x] Verify `components.json` created
  - [x] Configure 0px border radius globally in shadcn theme
- [x] Task 3: Install core dependencies (AC: #3)
  - [x] `pnpm add @supabase/ssr @supabase/supabase-js zustand` in web app
  - [x] Add workspace dependencies: `@cotulenh/core`, `@cotulenh/board`, `@cotulenh/common`
- [x] Task 4: Turborepo integration (AC: #4)
  - [x] Verify `pnpm-workspace.yaml` already covers `apps/cotulenh/*`
  - [x] Ensure `turbo.json` tasks (build, dev, lint, check-types) work with the web app
  - [x] Verify `pnpm build` from root builds the web app
- [x] Task 5: Create Supabase client helpers (AC: #5)
  - [x] Create `src/lib/supabase/browser.ts` — `createBrowserClient` for client components
  - [x] Create `src/lib/supabase/server.ts` — `createServerClient` for Server Components/Actions
  - [x] Create `src/lib/supabase/middleware.ts` — `createServerClient` for middleware token refresh
  - [x] Create `src/middleware.ts` — auth token refresh on every request
- [x] Task 6: Environment configuration (AC: #6)
  - [x] Create `.env.example` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [x] Create `.env.local` with placeholder values
  - [x] Ensure `.env.local` is in `.gitignore`
- [x] Task 7: Verify dev and build (AC: #7, #8)
  - [x] `pnpm dev --filter @cotulenh/web` starts without errors
  - [x] `pnpm build --filter @cotulenh/web` completes successfully
  - [x] Verify TypeScript compilation passes
- [x] Task 8: Edge Function proof-of-concept (AC: #9)
  - [x] Create `supabase/functions/validate-move/index.ts`
  - [x] Import `@cotulenh/core` and call `game.move()` with a test position
  - [x] Verify Deno compatibility — if import_map approach fails, create standalone ESM bundle as fallback
- [x] Task 9: Design system foundations in globals.css
  - [x] Define CSS custom property tokens for colors (see Dev Notes below)
  - [x] Define spacing tokens (4px base unit)
  - [x] Define typography tokens (system fonts, type scale)
  - [x] Set up dark/light theme variables
  - [x] Create `src/lib/utils/cn.ts` — Tailwind class merge utility

## Dev Notes

### Tech Stack — Exact Versions

- **Next.js 15** with App Router, React 19, TypeScript 5
- **Tailwind CSS 4** with PostCSS
- **shadcn/ui** — tree-shaken primitives, 0px border radius, no shadows/gradients
- **Zustand** — flat state, no nested objects
- **@supabase/ssr** + **@supabase/supabase-js** — cookie-based auth
- **Node.js 20+**
- **pnpm 8.15.6** (existing)
- **Turborepo 2.7.2** (existing)

### Project Structure — Target Directory Layout

```
apps/cotulenh/web/
├── package.json          # @cotulenh/web
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json       # shadcn/ui
├── tsconfig.json
├── .env.local
├── .env.example
└── src/
    ├── middleware.ts      # Auth token refresh, route protection
    ├── app/
    │   ├── globals.css   # Tailwind directives + CSS custom properties
    │   ├── layout.tsx    # Root layout (<html lang="vi">, providers)
    │   └── page.tsx      # Placeholder home page
    ├── components/
    │   └── ui/           # shadcn/ui primitives (auto-generated)
    ├── lib/
    │   ├── supabase/
    │   │   ├── browser.ts
    │   │   ├── server.ts
    │   │   └── middleware.ts
    │   └── utils/
    │       └── cn.ts     # clsx + tailwind-merge
    └── stores/           # Empty — ready for future Zustand stores
```

### Supabase Client Patterns

**browser.ts** — For client components:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**server.ts** — For Server Components and Server Actions:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )
}
```

**middleware.ts** — For auth token refresh:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )
  await supabase.auth.getUser()
  return supabaseResponse
}
```

**src/middleware.ts** — Entry point:
```typescript
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
```

### Design System Foundations (globals.css)

Define these CSS custom properties for the theme system:

**Color tokens:**
| Token | Light | Dark |
|-------|-------|------|
| `--color-primary` | Deep teal | Bright teal |
| `--color-primary-hover` | Darker teal | Lighter teal |
| `--color-surface` | White/warm gray | Dark charcoal |
| `--color-surface-elevated` | Light gray | Slightly lighter charcoal |
| `--color-text` | Near-black | Off-white |
| `--color-text-muted` | Mid-gray | Light gray |
| `--color-border` | Light gray | Dark gray |
| `--color-success` | Green | Green |
| `--color-warning` | Amber | Amber |
| `--color-error` | Red | Red |

**Typography tokens:**
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
```

**Type scale:** xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px)

**Spacing tokens:** Base unit 4px — `--space-1` through `--space-16` (4px to 64px)

**Shape:** 0px border radius everywhere. No shadows. No gradients. Borders for elevation.

**Theme approach:** CSS custom properties with `prefers-color-scheme` media query. Dark mode default for game screens. Both themes must pass WCAG 2.1 AA contrast (4.5:1 text, 3:1 interactive).

### Existing Monorepo Context — What Already Exists

**Workspace packages the dev MUST NOT recreate:**
- `@cotulenh/core` — Game engine (pure TS, ESM output, must also run in Deno)
- `@cotulenh/board` — Vanilla TS board UI component
- `@cotulenh/learn` — Lesson data/content
- `@cotulenh/common` — Shared utils, ESLint config, Vitest config
- `@cotulenh/combine-piece` — Piece combination library

**Existing SvelteKit app at `apps/cotulenh/app`:**
- The new Next.js app coexists alongside it — do NOT modify or delete the SvelteKit app
- Reference its Supabase patterns for consistency but implement with Next.js/React idioms

**Existing Supabase setup (`supabase/`):**
- `config.toml` — Local dev config (project: cotulenh, PostgreSQL 15, port 54322)
- `migrations/` — 10 migration files (profiles, friendships, games, invitations, etc.)
- `supabase/functions/` directory does NOT exist yet — create it for Edge Functions

**Existing root config:**
- `pnpm-workspace.yaml` pattern `apps/cotulenh/*` already covers the new `web` directory
- `turbo.json` tasks (build, lint, check-types, dev, test) apply to all workspace packages
- `.prettierrc` — singleQuote, no trailingComma, printWidth 100
- ESLint base config from `@cotulenh/common/eslint-config` — but the Svelte variant won't apply; create a Next.js-compatible ESLint config

**Naming conventions — MANDATORY:**
- DB-backed type properties: `snake_case` (matches PostgreSQL, no transformation layer)
- Functions/methods/variables: `camelCase`
- React components: `PascalCase`
- Component files: `kebab-case.tsx`
- Hooks: `use` + camelCase (e.g., `useBoard`)
- Stores: `use` + PascalCase + `Store` (e.g., `useGameStore`)
- Routes: kebab-case (e.g., `/game/[id]`)
- CSS tokens: `--` prefix, kebab-case
- Env vars: `SCREAMING_SNAKE_CASE`
- No barrel exports (index.ts re-exports) — direct imports only

### Edge Function Deno Compatibility

**Strategy for proof-of-concept:**
1. Create `supabase/functions/validate-move/index.ts`
2. Use `import_map.json` to map `@cotulenh/core` to the package's ESM build output
3. Instantiate `CoTuLenh` game, call `game.move()` with a test SAN
4. Return result as JSON response

**Fallback if import_map fails:**
- Create standalone ESM bundle via `vite build --lib` with Deno-compatible output
- Place in `supabase/functions/_shared/`

### Responsive Breakpoints

| Breakpoint | Width | Navigation |
|------------|-------|------------|
| Mobile | < 640px | Bottom tab bar (56px) |
| Tablet | 640–1024px | Bottom tab bar (56px) |
| Desktop | >= 1024px | Left sidebar (48px) |

Touch targets: 44x44px minimum, 8px gap between adjacent targets.

### Performance Targets

- FCP < 1.5s, LCP < 2.5s (landing page)
- < 200KB gzipped JS per route
- Skeleton screens for async content, never spinners for page loads
- SSR for public pages, client-rendered for authenticated app

### Accessibility Foundations

- `lang="vi"` on `<html>`
- WCAG 2.1 AA contrast compliance in both themes
- All UI content in Vietnamese (no i18n infrastructure for Phase 1)
- Keyboard navigation support throughout
- `prefers-reduced-motion` respected

### Project Structure Notes

- New app at `apps/cotulenh/web` integrates with existing monorepo workspace pattern
- Package name should be `@cotulenh/web` in package.json
- The existing `apps/cotulenh/app` (SvelteKit) remains untouched
- ESLint config needs a Next.js variant (existing `@cotulenh/common/eslint-config` has base + Svelte variants only)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Project Context Analysis] — Tech stack decisions
- [Source: _bmad-output/planning-artifacts/architecture.md#Source Tree] — Complete directory layout
- [Source: _bmad-output/planning-artifacts/architecture.md#Supabase Client Architecture] — Three-file Supabase pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Conventions] — Mandatory naming rules
- [Source: _bmad-output/planning-artifacts/architecture.md#Edge Functions] — Deno compatibility strategy
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Foundation] — Design tokens, colors, typography
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive & Accessibility] — Breakpoints, WCAG requirements
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — Acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- shadcn/ui init re-added Geist font to layout.tsx — removed and replaced with system fonts
- turbo.json needed `.next/**` added to build outputs to avoid warning
- Review fix pass: downgraded Next.js to 15.x for AC alignment and adjusted ESLint config compatibility
- Review fix pass: replaced unbound `import_map.json` strategy with function-local `deno.json` import mapping

### Completion Notes List

- Scaffolded Next.js 15 app at `apps/cotulenh/web` with TypeScript, Tailwind CSS 4, App Router, src/ directory
- Package named `@cotulenh/web`, configured with system fonts (no Google Fonts), `<html lang="vi">`
- Initialized shadcn/ui (base-nova style) with 0px border radius globally
- Installed @supabase/ssr, @supabase/supabase-js, zustand, and workspace deps (@cotulenh/core, @cotulenh/board, @cotulenh/common)
- Verified Turborepo integration: pnpm-workspace.yaml covers apps/cotulenh/*, turbo.json tasks work, added .next/** to build outputs
- Created three Supabase client helpers (browser, server, middleware) plus src/middleware.ts entry point
- Created .env.example and .env.local with Supabase URL and anon key placeholders
- Verified: `pnpm dev`, `pnpm build`, `tsc --noEmit`, and `eslint` all pass cleanly
- Created Edge Function proof-of-concept at supabase/functions/validate-move/index.ts with function-local `deno.json` import mapping and a verified legal `game.move()` call for Deno compatibility
- Added design system CSS custom properties: color tokens (light/dark), spacing tokens (4px base), typography tokens (system fonts, type scale), prefers-color-scheme media query support
- Created cn.ts utility at src/lib/utils/cn.ts with re-export from src/lib/utils.ts for shadcn compatibility
- Created empty src/stores/ directory for future Zustand stores
- Configured next.config.ts with transpilePackages for workspace dependencies
- Review remediation applied: removed accidental nested Git repository in `apps/cotulenh/web/.git`
- Review remediation applied: `.env.example` is now explicitly tracked while `.env.local` remains ignored
- Review remediation applied: default home page copy changed to Vietnamese and README updated to project-specific instructions
- Review remediation applied: Supabase server helper now tolerates cookie writes from Server Components without throwing

### Change Log

- 2026-03-09: Initial implementation of Story 1.1 — all 9 tasks completed
- 2026-03-09: Senior review fixes applied (5 issues fixed: 2 high, 3 medium)
- 2026-03-09: Code review remediation applied (3 issues fixed: 1 high, 1 medium, 1 low)

### File List

New files:
- apps/cotulenh/web/.gitignore
- apps/cotulenh/web/package.json
- apps/cotulenh/web/next.config.ts
- apps/cotulenh/web/tsconfig.json
- apps/cotulenh/web/postcss.config.mjs
- apps/cotulenh/web/components.json
- apps/cotulenh/web/eslint.config.mjs
- apps/cotulenh/web/README.md
- apps/cotulenh/web/.env.example
- apps/cotulenh/web/src/app/globals.css
- apps/cotulenh/web/src/app/layout.tsx
- apps/cotulenh/web/src/app/page.tsx
- apps/cotulenh/web/src/app/favicon.ico
- apps/cotulenh/web/src/middleware.ts
- apps/cotulenh/web/src/lib/supabase/browser.ts
- apps/cotulenh/web/src/lib/supabase/server.ts
- apps/cotulenh/web/src/lib/supabase/middleware.ts
- apps/cotulenh/web/src/lib/utils.ts
- apps/cotulenh/web/src/lib/utils/cn.ts
- apps/cotulenh/web/src/components/ui/button.tsx
- apps/cotulenh/web/public/file.svg
- apps/cotulenh/web/public/globe.svg
- apps/cotulenh/web/public/next.svg
- apps/cotulenh/web/public/vercel.svg
- apps/cotulenh/web/public/window.svg
- supabase/functions/validate-move/index.ts
- supabase/functions/validate-move/deno.json
- supabase/functions/validate-move/deno.lock

Modified files:
- turbo.json (added .next/** to build outputs)
- pnpm-lock.yaml

Deleted files:
- supabase/functions/import_map.json

### Senior Developer Review (AI)

Reviewer: Codex (GPT-5)  
Date: 2026-03-09

Review findings addressed:

1. **HIGH** — Next.js version mismatch to AC (#15 required): fixed by aligning to Next.js 15.x and updating lockfile.
2. **HIGH** — Deno import map wiring risk for Edge Function: fixed with function-local `deno.json` import mapping.
3. **MEDIUM** — Nested Git repo in `apps/cotulenh/web`: fixed by removing accidental `.git` directory.
4. **MEDIUM** — `.env.example` was ignored by app-level `.gitignore`: fixed with `!.env.example`.
5. **MEDIUM** — English placeholder UI text on home page: fixed to Vietnamese copy.
6. **HIGH** — Edge Function proof-of-concept used an illegal move (`Bb3`), so it did not validate `game.move()` at all: fixed by switching to the verified legal move `c5-c6`.
7. **MEDIUM** — Server Supabase helper attempted cookie writes from Server Components, which can throw during token refresh: fixed by using a no-op fallback when cookie persistence is unavailable.
8. **LOW** — App metadata description remained in English: fixed to Vietnamese.

Verification after fixes:

- `pnpm --filter @cotulenh/web run lint` ✅
- `pnpm --filter @cotulenh/web run check-types` ✅
- `pnpm --filter @cotulenh/web run build` ✅
- `pnpm dev --filter @cotulenh/web` starts successfully on Next.js 15.5.12 ✅
- `node --input-type=module -e "import { CoTuLenh } from './packages/cotulenh/core/dist/cotulenh.js'; const game = new CoTuLenh(); console.log(game.move('c5-c6')?.san)"` returns `Ic6` ✅
