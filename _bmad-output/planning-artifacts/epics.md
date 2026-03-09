---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: complete
completedAt: '2026-03-09'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# cotulenh-monorepo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for cotulenh-monorepo, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Visitors can access the learn system and complete interactive lessons without creating an account
FR2: Learners can interact with an in-lesson board to practice piece movements, placement, and game mechanics
FR3: Learners can track their lesson progress across sessions without an account
FR4: Learners who sign up can have their anonymous lesson progress automatically migrated to their account
FR5: Learners who complete 3 or more lessons can see a contextual prompt to sign up and play a real opponent
FR6: Players can participate in a deploy session at the start of each game, placing deployable pieces on their side of the board, with the game clock running during deployment
FR7: Players can make moves in alternating turns with synchronization to their opponent's board
FR8: Players can see legal move indicators when selecting a piece
FR9: Players can play under time-controlled conditions with synchronized countdown clocks
FR10: Players can resign, offer a draw, or request a takeback during a game
FR11: Players can request and accept/decline a rematch after a game ends
FR12: Players can choose to play a rated or casual game when creating a challenge
FR13: Players can create an open challenge with Rapid time control presets and publish it to the lobby
FR14: Players can browse open challenges in the lobby and accept one to start a game
FR15: Players can send a friend challenge directly to a specific player
FR16: Players can generate and share an invite link that directs the recipient to sign up and become their friend
FR17: Users who sign up via an invite link are automatically connected as friends with the inviter
FR18: Players earn a Glicko-2 rating for the Rapid time control, updated after each rated game
FR19: Players with fewer than 30 rated games are flagged as provisional with a visible indicator
FR20: Players can see their rating change (gain/loss with delta) immediately after a rated game ends
FR21: Players can view an activity leaderboard ranked by games played in the current month
FR22: Visitors can create an account with email and password
FR23: Players can sign in and maintain an authenticated session
FR24: Players can reset their password via email link
FR25: Players can view their own and other players' profiles showing current rating, game count, and game history
FR26: Players can manage a friends list with online/offline status indicators
FR27: Players can challenge online friends directly from the friends list
FR28: Players can view a list of their completed games with opponent, result, and rating change
FR29: Players can replay a completed game move-by-move using the move list
FR30: Players can export a game's move record in PGN format
FR31: Players who lose connection during a game are automatically reconnected with game state preserved
FR32: Both players' clocks pause during a disconnection, with automatic forfeit after a 60-second timeout window
FR33: The system records game abandonments (browser close, timeout) with a distinct status from disconnection forfeits
FR34: Players can navigate the platform using a persistent sidebar (desktop) or bottom tab bar (mobile)
FR35: Players see a board-centric home dashboard with single-tap navigation to play, active games, and recent games
FR36: The game board occupies at least 60% of the viewport on all screen sizes during gameplay, with no UI elements overlapping the board area
FR37: Players can start a game against an AI opponent at selectable difficulty levels when no human opponents are available
FR38: Players can join and compete in time-limited arena tournaments where pairings rotate automatically and standings update within 5 seconds of each game's completion

### NonFunctional Requirements

NFR1: Move synchronization between players completes in under 500ms at the 95th percentile
NFR2: Game page reaches Time to Interactive in under 3 seconds on a 4G mobile connection
NFR3: Landing page First Contentful Paint under 1.5 seconds, Largest Contentful Paint under 2.5 seconds
NFR4: Initial JavaScript bundle size under 200KB gzipped, ensuring fast load on mobile networks
NFR5: Board first render completes in under 500ms after page load
NFR6: Clock display updates at least once per second with clock drift between players not exceeding 500ms
NFR7: Lobby challenge list updates in real-time — accepted/cancelled challenges disappear within 1 second
NFR8: Game state persists server-side with a 99.9% recovery success rate — no game is lost due to a single client disconnection, verified by automated reconnection tests under simulated network interruption
NFR9: Disconnected players automatically reconnect with full game state restored, including correct clock values, within 5 seconds of network recovery
NFR10: If a player remains disconnected beyond 60 seconds, the system forfeits the game with a "disconnection forfeit" status visible to both players
NFR11: Rating updates are atomic with game completion — a crash between game end and rating write must not leave ratings in a partial state
NFR12: Platform-caused game failures (bugs, crashes, desyncs) occur in fewer than 1% of completed games, as classified by server error logs correlated with game completion records
NFR13: Game completion rate — started games that end via checkmate, resignation, draw agreement, or timeout, excluding disconnection forfeits — exceeds 90%
NFR14: All client-server communication uses HTTPS/WSS — no unencrypted data in transit
NFR15: User passwords are hashed and never stored or transmitted in plaintext
NFR16: Data access controls enforce that players can only read or modify their own profile data and only submit actions for games in which they are a participant
NFR17: Game moves are validated server-side — the client cannot submit illegal moves or moves out of turn
NFR18: Authentication endpoints enforce rate limiting of no more than 5 failed attempts per minute per IP address, with progressive lockout after 15 failed attempts per hour
NFR19: All text meets WCAG 2.1 AA contrast ratios — 4.5:1 for body text, 3:1 for interactive elements
NFR20: All interactive elements are keyboard-navigable with focus indicators meeting WCAG 2.1 AA Success Criterion 2.4.7
NFR21: Board squares are individually focusable with descriptive labels (e.g., "B4: Red Infantry")
NFR22: Animations and pulse effects respect prefers-reduced-motion system setting
NFR23: Game state changes (moves, clock critical, deploy progress) are announced via ARIA live regions
NFR24: Architecture supports scaling from 5 to 500 concurrent users without requiring a rewrite, verified by load tests sustaining 500 concurrent WebSocket connections with under 1 second move latency at the 99th percentile
NFR25: Realtime game moves use ephemeral messaging rather than database writes, keeping database operations per game under 10 (create, state snapshots, result) regardless of move count

### Additional Requirements

From Architecture:
- Starter template: vanilla create-next-app at apps/cotulenh/web, with post-init shadcn/ui, @supabase/ssr, @supabase/supabase-js, and Zustand setup
- Turborepo pipeline configuration for the new web app
- Supabase client helpers (browser.ts, server.ts, middleware.ts) and Next.js Middleware for auth token refresh and route protection
- New DB table: game_states (server-side game state snapshots for reconnection + move validation)
- New DB table: ratings (Glicko-2 rating per player per time control)
- New DB table: tournaments (tournament metadata, standings, pairings)
- Edge Function: validate-move (server-side move validation via @cotulenh/core replay from DEFAULT_POSITION, SELECT...FOR UPDATE concurrency locking)
- Edge Function: complete-game (atomic game result + Glicko-2 rating update in single PostgreSQL transaction)
- Edge Function: tournament-pair (arena tournament auto-pairing logic)
- Deno compatibility validation: @cotulenh/core must run in Supabase Edge Functions (Deno runtime) — highest integration risk, requires early validation spike
- supabase/functions/ directory creation during project initialization
- Glicko-2 algorithm implementation in @cotulenh/common package (new code, shared between app and Edge Functions)
- Deployment ordering: 1) DB migrations, 2) Edge Functions, 3) Next.js app — CI/CD must enforce this sequence
- GitHub Actions CI pipeline: lint, type-check, test on PR with Turborepo caching
- Vitest for unit tests (co-located), Playwright for E2E tests
- Supabase cron job: 15-second check for disconnect forfeit (game_states where disconnect_at > 60s)
- Supabase cron job: 24-hour abandoned game cleanup (games with status 'started' and stale updated_at set to 'aborted')
- Broadcast channel authorization: RLS for Realtime restricting game channels to participants
- Event ordering: monotonically increasing seq numbers on all Broadcast events, gap detection triggers full state re-fetch
- Atomicity rule: games row and game_states row must be created in the same DB transaction

From UX Design:
- Board-centric layout: board occupies 60%+ viewport, never resizes when panel content changes
- Responsive breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- Desktop: sidebar (48px) + board + right panel (280-320px). Mobile: bottom tab bar (56px) + full-width board + tabs below
- Dark and light theme with system preference detection
- Skeleton screens for all async content (never spinners for page loads)
- Touch targets: 44x44px minimum on mobile, 8px gap between adjacent targets
- System fonts only — zero font loading delay
- Vietnamese language only for all user-facing strings (hardcoded, no i18n infrastructure)
- WCAG 2.1 AA accessibility throughout: contrast ratios, keyboard navigation, focus rings, ARIA live regions, prefers-reduced-motion
- Landing page: SSR-rendered, board hero visual, clear learn/play/signup CTAs
- Deploy phase UX: piece tray, placement preview, commit/cancel controls, simultaneous blind deployment
- Game result banner with rating change display, rematch/new game actions
- Reconnection UX: "Reconnecting..." banner, greyed board, clock pause indicator

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | Learn system access without account |
| FR2 | Epic 2 | Interactive in-lesson board |
| FR3 | Epic 2 | localStorage lesson progress tracking |
| FR4 | Epic 2 | Progress migration on signup |
| FR5 | Epic 2 | Signup prompt after 3+ lessons |
| FR6 | Epic 3 | Deploy session at game start |
| FR7 | Epic 3 | Alternating turns with sync |
| FR8 | Epic 3 | Legal move indicators |
| FR9 | Epic 3 | Synchronized countdown clocks |
| FR10 | Epic 3 | Resign, draw offer, takeback |
| FR11 | Epic 3 | Rematch after game end |
| FR12 | Epic 3 | Rated/casual game toggle |
| FR13 | Epic 4 | Create open challenge to lobby |
| FR14 | Epic 4 | Browse and accept lobby challenges |
| FR15 | Epic 4 | Send friend challenge |
| FR16 | Epic 4 | Generate/share invite link |
| FR17 | Epic 4 | Auto-friend on invite signup |
| FR18 | Epic 6 | Glicko-2 rating per player |
| FR19 | Epic 6 | Provisional rating flag |
| FR20 | Epic 6 | Post-game rating change display |
| FR21 | Epic 6 | Activity leaderboard |
| FR22 | Epic 1 | Account creation (email/password) |
| FR23 | Epic 1 | Sign in and session management |
| FR24 | Epic 1 | Password reset via email |
| FR25 | Epic 5 | Player profiles (own + public) |
| FR26 | Epic 5 | Friends list with online status |
| FR27 | Epic 5 | Challenge friends from friends list |
| FR28 | Epic 7 | Completed games list |
| FR29 | Epic 7 | Move-by-move game replay |
| FR30 | Epic 7 | PGN export |
| FR31 | Epic 3 | Auto-reconnection with state preserved |
| FR32 | Epic 3 | Clock pause on disconnect + 60s forfeit |
| FR33 | Epic 3 | Abandonment recording |
| FR34 | Epic 1 | Sidebar/bottom tab bar navigation |
| FR35 | Epic 1 | Board-centric home dashboard |
| FR36 | Epic 3 | Board 60%+ viewport |
| FR37 | Epic 8 | AI opponent |
| FR38 | Epic 8 | Arena tournaments |

## Epic List

### Epic 1: Project Foundation & App Shell
Users can access the platform, see a landing page, sign up, sign in, reset their password, and navigate the app using a persistent sidebar (desktop) or bottom tab bar (mobile). Authenticated users see a board-centric home dashboard with single-tap navigation to play, active games, and recent games.
**FRs covered:** FR22, FR23, FR24, FR34, FR35
**Priority:** MVP - Must Have

### Epic 2: Learn the Game
Visitors can discover Co Tu Lenh through interactive lessons without signing up. They track progress locally via localStorage, and when they create an account, their progress migrates seamlessly. After completing 3+ lessons, they see a contextual prompt to sign up and play a real opponent.
**FRs covered:** FR1, FR2, FR3, FR4, FR5
**Priority:** MVP - Must Have

### Epic 3: Play a Game
Two players can play a full game of Co Tu Lenh online — deploy session with simultaneous blind deployment, alternating moves with legal move indicators, synchronized countdown clocks, resign/draw/takeback, rated/casual toggle, rematch, and game result. The board occupies 60%+ of the viewport. Players who disconnect are automatically reconnected with game state and clocks preserved, with automatic forfeit after 60 seconds. Game abandonments are recorded distinctly.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR31, FR32, FR33, FR36
**Priority:** MVP - Must Have

### Epic 4: Find an Opponent
Players can create open challenges with Rapid time control presets and publish them to the lobby, browse and accept open challenges, send friend challenges directly, and generate shareable invite links. Users who sign up via an invite link are automatically connected as friends with the inviter.
**FRs covered:** FR13, FR14, FR15, FR16, FR17
**Priority:** MVP - Must Have

### Epic 5: Social & Friends
Players can view their own and other players' public profiles (current rating, game count, game history), manage a friends list with online/offline presence indicators, and challenge online friends directly from the friends list.
**FRs covered:** FR25, FR26, FR27
**Priority:** MVP - Must Have

### Epic 6: Ratings & Leaderboard
Players earn a Glicko-2 rating for Rapid time control updated after each rated game. Players with fewer than 30 rated games are flagged as provisional. Rating change (gain/loss delta) is displayed immediately after a rated game. An activity leaderboard ranks players by games played in the current month.
**FRs covered:** FR18, FR19, FR20, FR21
**Priority:** MVP - Must Have

### Epic 7: Game History & Review
Players can view a list of their completed games with opponent, result, and rating change. They can replay any completed game move-by-move and export the move record in PGN format.
**FRs covered:** FR28, FR29, FR30
**Priority:** MVP - Must Have

### Epic 8: AI Opponent & Arena Tournaments
Players can play against an AI opponent at selectable difficulty levels for practice when no human opponents are available. Players can join time-limited arena tournaments with automatic rotating pairings and live standings updates.
**FRs covered:** FR37, FR38
**Priority:** Stretch / Concurrent - ships when ready, not MVP-blocking

---

## Epic 1: Project Foundation & App Shell

Users can access the platform, see a landing page, sign up, sign in, reset their password, and navigate the app using a persistent sidebar (desktop) or bottom tab bar (mobile). Authenticated users see a board-centric home dashboard with single-tap navigation to play, active games, and recent games.

### Story 1.1: Project Initialization & Monorepo Integration

As a developer,
I want the Next.js 15 app scaffolded within the monorepo with all core dependencies and Supabase client infrastructure configured,
So that all subsequent stories have a working foundation to build on.

**Acceptance Criteria:**

**Given** the existing monorepo with pnpm + Turborepo
**When** the initialization is complete
**Then** a new Next.js 15 app exists at `apps/cotulenh/web` with TypeScript, Tailwind CSS 4, App Router, and `src/` directory
**And** shadcn/ui is initialized with `components.json` configured
**And** `@supabase/ssr`, `@supabase/supabase-js`, and `zustand` are installed
**And** Turborepo `turbo.json` includes pipeline tasks for the `web` app (dev, build, lint, type-check)
**And** Supabase client helpers exist at `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, and `src/lib/supabase/middleware.ts`
**And** `.env.local` and `.env.example` are created with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` placeholders
**And** `pnpm dev --filter @cotulenh/web` starts the dev server without errors
**And** `pnpm build --filter @cotulenh/web` completes successfully
**And** a proof-of-concept Edge Function in `supabase/functions/` imports `@cotulenh/core` and runs a basic `game.move()` call to validate Deno compatibility

### Story 1.2: Landing Page

As a visitor,
I want to see an inviting landing page that introduces Co Tu Lenh and gives me clear paths to learn or play,
So that I understand what the platform offers and can take action immediately.

**Acceptance Criteria:**

**Given** an unauthenticated visitor navigates to the root URL
**When** the landing page loads
**Then** the page is SSR-rendered with `lang="vi"` and Vietnamese content
**And** a board hero visual is displayed prominently
**And** clear CTAs for "Learn", "Play", and "Sign Up" are visible
**And** a minimal public navigation bar shows the logo, Learn link, and Sign In link
**And** dark and light themes are supported with system preference detection via CSS `prefers-color-scheme`
**And** the page uses system fonts only with zero font loading delay
**And** First Contentful Paint is under 1.5 seconds and Largest Contentful Paint is under 2.5 seconds (NFR3)
**And** the page is responsive across mobile (<640px), tablet (640-1024px), and desktop (>1024px) breakpoints

**Given** an authenticated user navigates to the root URL
**When** the page loads
**Then** they are redirected to the dashboard

### Story 1.3: User Registration & Login

As a visitor,
I want to create an account with email and password and sign in to access the platform,
So that I can play games and track my progress.

**Acceptance Criteria:**

**Given** a visitor is on the signup page
**When** they enter a valid email, password, and display name and submit
**Then** an account is created via Supabase Auth
**And** a `profiles` row is created with the display name
**And** they are redirected to the dashboard as an authenticated user

**Given** a visitor enters an email that is already registered
**When** they submit the signup form
**Then** an inline error message is displayed in Vietnamese

**Given** a registered user is on the login page
**When** they enter valid credentials and submit
**Then** they are signed in with a persistent session via Supabase Auth cookies
**And** they are redirected to the dashboard

**Given** a user enters incorrect credentials
**When** they submit the login form
**Then** an inline error message is displayed in Vietnamese
**And** after 5 failed attempts per minute, further attempts are rate-limited (NFR18)

**Given** Next.js Middleware is configured
**When** any request hits a protected `(app)` route without a valid session
**Then** the user is redirected to the login page
**And** auth tokens are refreshed on every request via middleware

### Story 1.4: Password Reset

As a registered user,
I want to reset my password via an email link,
So that I can recover access to my account if I forget my password.

**Acceptance Criteria:**

**Given** a user is on the password reset request page
**When** they enter their registered email and submit
**Then** a password reset email is sent via Supabase Auth
**And** a confirmation message is displayed in Vietnamese

**Given** a user clicks the reset link in their email
**When** the reset page loads
**Then** they can enter a new password
**And** on submission, their password is updated
**And** they are redirected to the login page with a success message

**Given** a user enters an unregistered email on the reset page
**When** they submit
**Then** the same confirmation message is shown (no email enumeration)

### Story 1.5: App Shell & Navigation

As an authenticated user,
I want a persistent navigation structure that adapts to my screen size,
So that I can move between sections of the platform quickly.

**Acceptance Criteria:**

**Given** an authenticated user is on any `(app)` route on desktop (>1024px)
**When** the page renders
**Then** a left sidebar (48px) is displayed with icon navigation items for Dashboard, Play, Friends, Leaderboard, and Settings
**And** the active route is visually highlighted
**And** all nav items have keyboard focus indicators meeting WCAG 2.1 AA (NFR20)

**Given** an authenticated user is on any `(app)` route on mobile (<1024px)
**When** the page renders
**Then** a bottom tab bar (56px) is displayed with the same navigation items
**And** touch targets are at least 44x44px with 8px gaps between adjacent targets

**Given** the `(app)` layout is rendering
**When** a route change occurs within the app
**Then** skeleton screens are shown for async content (never spinners for page loads)
**And** the sidebar/bottom bar remains persistent and does not re-render

**Given** the `(auth)` route group
**When** signup, login, or reset-password pages render
**Then** a centered form layout is used without the app sidebar/bottom bar

### Story 1.6: Home Dashboard

As an authenticated user,
I want a board-centric home dashboard with quick access to play, my active games, and recent games,
So that I can jump into the action with a single tap.

**Acceptance Criteria:**

**Given** an authenticated user navigates to the dashboard
**When** the page loads
**Then** a board-centric layout is displayed with navigation cards for "Play", "Active Games", and "Recent Games"
**And** each card is tappable/clickable and navigates to the appropriate section
**And** the layout is responsive — single column on mobile, multi-column on desktop

**Given** a new user with no game history
**When** they view the dashboard
**Then** appropriate empty states are shown for active games and recent games with encouraging CTAs (e.g., "Start your first game" in Vietnamese)

**Given** the dashboard page is loading
**When** data is being fetched
**Then** skeleton screens are displayed for all async content sections

## Epic 2: Learn the Game

Visitors can discover Co Tu Lenh through interactive lessons without signing up. They track progress locally via localStorage, and when they create an account, their progress migrates seamlessly. After completing 3+ lessons, they see a contextual prompt to sign up and play a real opponent.

### Story 2.1: Learn Hub & Lesson Navigation

As a visitor,
I want to browse a learn hub showing all available subjects and lessons,
So that I can choose what to learn about Co Tu Lenh at my own pace.

**Acceptance Criteria:**

**Given** a visitor (authenticated or not) navigates to `/learn`
**When** the page loads
**Then** a grid of lesson subjects is displayed, sourced from the `@cotulenh/learn` package
**And** each subject shows its title, description, and number of lessons
**And** the page is SSR-rendered for SEO with appropriate `title` and `description` meta tags
**And** no login prompt or auth gate is shown
**And** the page is responsive — single column on mobile, multi-column on desktop
**And** all text is in Vietnamese

**Given** a visitor clicks on a subject
**When** the subject page loads
**Then** the individual lessons within that subject are listed in order
**And** each lesson shows its title and a brief description

**Given** the learn hub is loading
**When** data is being prepared
**Then** skeleton screens are shown for the subject grid

### Story 2.2: Interactive Lesson Board

As a learner,
I want to interact with a board during lessons to practice piece movements and game mechanics,
So that I learn by doing rather than just reading.

**Acceptance Criteria:**

**Given** a learner navigates to a lesson page at `/learn/[subject]/[id]`
**When** the page loads
**Then** an interactive `cotulenh-board` is mounted via the `useBoard` hook in a non-realtime context
**And** lesson instructions are displayed in a panel (right panel on desktop, below board on mobile)
**And** the board renders within 500ms of page load (NFR5)

**Given** a lesson step asks the learner to move a specific piece
**When** the learner taps/clicks a piece on the board
**Then** legal move indicators are shown on valid destination squares
**And** when the learner makes the correct move, positive feedback is displayed (e.g., green flash)
**And** when the learner makes an incorrect move, gentle corrective feedback is shown

**Given** a lesson has multiple steps
**When** the learner completes a step
**Then** the next step loads automatically with updated board position and instructions
**And** a progress indicator shows current step out of total steps

**Given** a learner is on a lesson page
**When** they want to go back to the learn hub
**Then** navigation back to `/learn` is available without losing their place in the lesson

**Given** the board is rendered
**When** keyboard navigation is used
**Then** board squares are individually focusable with descriptive aria-labels (NFR21)
**And** game state changes are announced via ARIA live regions (NFR23)

### Story 2.3: Lesson Progress Tracking

As a learner without an account,
I want my lesson progress saved automatically across browser sessions,
So that I can return later and continue where I left off.

**Acceptance Criteria:**

**Given** a learner completes a lesson
**When** the lesson ends
**Then** completion status is saved to localStorage keyed by lesson ID
**And** the `useLearnStore` Zustand store reflects the updated progress

**Given** a learner returns to the learn hub after completing some lessons
**When** the page loads
**Then** completed lessons show a completion indicator
**And** subjects show progress (e.g., "3/5 lessons completed")
**And** progress is read from localStorage on mount

**Given** a learner clears their browser data
**When** they return to the learn hub
**Then** all progress indicators reset to zero (expected behavior, no error)

**Given** a learner has progress in localStorage
**When** they navigate between learn pages
**Then** progress state is consistent and does not flicker or reset

### Story 2.4: Progress Migration & Signup Prompt

As a learner who has completed several lessons,
I want to be prompted to sign up and have my progress carry over to my new account,
So that I can start playing real opponents without losing what I've learned.

**Acceptance Criteria:**

**Given** an unauthenticated learner has completed 3 or more lessons
**When** they finish a lesson
**Then** a contextual, non-blocking prompt appears suggesting they sign up to play a real opponent
**And** the prompt is in Vietnamese and dismissible
**And** the prompt does not appear if already dismissed in this session

**Given** a learner with localStorage progress signs up for an account
**When** account creation completes
**Then** the `migrateProgress` Server Action reads localStorage lesson data and writes it to the `learn_progress` DB table for the new user
**And** localStorage progress is cleared after successful migration
**And** the user sees their existing progress intact on the learn hub

**Given** a learner with localStorage progress logs into an existing account
**When** login completes
**Then** if the account has no existing learn progress, localStorage progress is migrated
**And** if the account already has learn progress, the more complete set is kept (no overwrite of existing DB progress)

**Given** an authenticated user completes a lesson
**When** the lesson ends
**Then** progress is written directly to the `learn_progress` DB table (not localStorage)

## Epic 3: Play a Game

Two players can play a full game of Co Tu Lenh online — deploy session with simultaneous blind deployment, alternating moves with legal move indicators, synchronized countdown clocks, resign/draw/takeback, rated/casual toggle, rematch, and game result. The board occupies 60%+ of the viewport. Players who disconnect are automatically reconnected with game state and clocks preserved, with automatic forfeit after 60 seconds. Game abandonments are recorded distinctly.

### Story 3.1: Game Page Layout & Board Integration

As a player,
I want a game page with a board-centric layout that adapts to my screen size,
So that the board is always the focus and I can see game information without distraction.

**Acceptance Criteria:**

**Given** a player navigates to `/game/[id]`
**When** the page loads
**Then** the `cotulenh-board` is mounted via the `useBoard` hook into a container ref
**And** the board occupies at least 60% of the viewport on all screen sizes (FR36)
**And** no UI elements overlap the board area
**And** the board renders within 500ms of page load (NFR5)

**Given** the player is on desktop (>1024px)
**When** the game page renders
**Then** player info bars are shown above and below the board
**And** a tabbed right panel (280-320px) displays move list, game controls, and chat placeholder
**And** the board never resizes when panel content changes

**Given** the player is on mobile (<1024px)
**When** the game page renders
**Then** the board is full-width
**And** player info bars are compact above and below the board
**And** game information is accessible via tabs below the board

**Given** the game page is loading
**When** data is being fetched
**Then** skeleton screens are displayed for the board area and panels
**And** the page reaches Time to Interactive in under 3 seconds on 4G (NFR2)

**Given** the board is rendered
**When** keyboard navigation is used
**Then** board squares are individually focusable with descriptive aria-labels (NFR21)

### Story 3.2: Game Creation & Database Setup

As a player,
I want to create a new game with rated or casual options,
So that a game record exists and both players can join.

**Acceptance Criteria:**

**Given** a new `game_states` migration is applied
**When** the migration runs
**Then** the `game_states` table exists with columns: `id` (uuid PK), `game_id` (uuid FK to games), `move_history` (text[]), `fen` (text), `deploy_state` (jsonb), `phase` (text), `clocks` (jsonb), `updated_at` (timestamptz)
**And** RLS policies restrict read access to game participants and write access to Edge Functions (service role)

**Given** a game creation is initiated (via Server Action)
**When** the creation request is processed
**Then** a `games` row and a `game_states` row are created in the same database transaction (atomicity rule)
**And** the game has `status = 'started'` and the `game_states` has `phase = 'deploying'`
**And** clocks are initialized based on the selected Rapid time control preset
**And** the `is_rated` flag is set based on the player's choice (FR12)

**Given** a game is created without a corresponding `game_states` row
**When** this invalid state is detected
**Then** the transaction rolls back and an error is returned (no orphaned games)

### Story 3.3: Deploy Session

As a player,
I want to place my deployable pieces on my side of the board before the game begins,
So that I can set up my strategy without my opponent seeing my placements.

**Acceptance Criteria:**

**Given** both players have joined a game and the phase is `'deploying'`
**When** the deploy session starts
**Then** the game clock starts running during deployment (FR6)
**And** each player sees a piece tray showing their deployable pieces
**And** a deploy progress counter shows "Piece X of Y"

**Given** a player is in the deploy phase
**When** they tap a deployable piece and then a valid board square
**Then** the piece is placed on the board as a local preview via `game.move({ from, to, deploy: true })`
**And** the placement accumulates in a `MoveSession` on the client
**And** the player can cancel and redo placements via `game.cancelSession()`

**Given** a player is satisfied with their deployment
**When** they tap "Commit"
**Then** `game.commitSession()` is called locally and the committed SAN array is sent to the validate-move Edge Function
**And** the Edge Function validates the deploy sequence against authoritative game state
**And** on success, a `deploy_submitted` event is broadcast to the opponent (without revealing placement)

**Given** both players have submitted valid deployments
**When** the Edge Function confirms both submissions
**Then** `deploy_commit` events are broadcast to both players with each other's deploy SANs
**And** the `game_states.phase` transitions from `'deploying'` to `'playing'`
**And** both players see the full board with all pieces placed

**Given** only one player has submitted their deployment
**When** the other player is still placing pieces
**Then** a "Waiting for opponent..." indicator is shown to the player who submitted
**And** the opponent's deployment is not revealed

### Story 3.4: Move Execution & Server-Side Validation

As a player,
I want my moves validated by the server and synchronized to my opponent in real-time,
So that the game is fair and both players always see the same board state.

**Acceptance Criteria:**

**Given** the game phase is `'playing'` and it is the player's turn
**When** the player selects a piece
**Then** legal move indicators are shown on valid destination squares (FR8)

**Given** the player selects a destination square
**When** the move is submitted
**Then** the move is applied optimistically on the client via `game.move(san)`
**And** the SAN string is sent to the validate-move Edge Function
**And** the Edge Function reads `game_states.move_history` from DB using `SELECT ... FOR UPDATE` for concurrency locking
**And** the Edge Function replays all moves from `DEFAULT_POSITION` using `CoTuLenh` engine to reconstruct authoritative state
**And** the proposed move is validated against the reconstructed state

**Given** the Edge Function validates the move successfully
**When** validation completes
**Then** the move is appended to `game_states.move_history`, `fen` is updated
**And** a `move` event with `{ san, fen }` and a monotonically increasing `seq` number is broadcast via the game channel
**And** move synchronization completes in under 500ms at the 95th percentile (NFR1)

**Given** the Edge Function rejects the move
**When** the rejection is received by the client
**Then** the optimistic move is rolled back on the board
**And** an error toast is shown in Vietnamese

**Given** it is not the player's turn
**When** they attempt to interact with the board
**Then** no move is allowed and the Edge Function returns `WRONG_TURN` (HTTP 403) if a request reaches it

**Given** the client receives a Broadcast event
**When** the event's `seq` number has a gap (seq > last_seen_seq + 1)
**Then** the client triggers a full state re-fetch from `game_states` and replays the authoritative `move_history`

**Given** the client receives a Broadcast event
**When** the event's `seq` is less than or equal to `last_seen_seq`
**Then** the event is discarded (duplicate)

### Story 3.5: Chess Clocks & Time Control

As a player,
I want synchronized countdown clocks showing remaining time for both players,
So that I can manage my time and know how much time my opponent has.

**Acceptance Criteria:**

**Given** a game is in progress
**When** the game page is displayed
**Then** both players' clocks are shown with remaining time
**And** the active player's clock counts down locally
**And** the clock display updates at least once per second (NFR6)

**Given** a move is confirmed by the server
**When** the `move` event is broadcast
**Then** a `clock_sync` payload is piggybacked with authoritative clock values `{ red: number, blue: number }` in milliseconds
**And** the client updates its local clock to match the server-authoritative values
**And** clock drift between players does not exceed 500ms (NFR6)

**Given** a player's clock reaches a critical threshold (e.g., under 30 seconds)
**When** the clock updates
**Then** a visual warning is shown (e.g., clock turns red)
**And** the critical state is announced via ARIA live region (NFR23)

**Given** the local client clock is running between server syncs
**When** the display updates
**Then** the local clock is display-only and the server clock remains authoritative

### Story 3.6: Game End Conditions & Result

As a player,
I want the game to end correctly when checkmate, stalemate, or timeout occurs,
So that the result is recorded accurately and I see the outcome clearly.

**Acceptance Criteria:**

**Given** a move results in checkmate
**When** the validate-move Edge Function detects checkmate after applying the move
**Then** the complete-game Edge Function is called with status `'checkmate'` and the winner
**And** the `games` row is updated atomically with `status` and `winner`
**And** a game end event is broadcast to both players

**Given** a move results in stalemate
**When** the validate-move Edge Function detects stalemate
**Then** the complete-game Edge Function is called with status `'stalemate'`
**And** the game is recorded as a draw

**Given** a player's server-side clock reaches zero
**When** the opponent sends a `timeout_claim` to the complete-game Edge Function
**Then** the server recalculates from `last_move_timestamp` plus accumulated deltas
**And** if the server-side clock is also <= 0, the game is completed with status `'timeout'` and the opponent wins
**And** if the server-side clock is not <= 0, a `clock_sync` correction is broadcast instead

**Given** a game has ended
**When** the result is displayed
**Then** a game result banner shows the outcome (win/loss/draw), the method (checkmate/stalemate/timeout/resign/draw), and both players' final positions
**And** action buttons for rematch and new game are shown

### Story 3.7: Resign, Draw Offer & Takeback

As a player,
I want to resign, offer a draw, or request a takeback during a game,
So that I have full control over my game experience.

**Acceptance Criteria:**

**Given** a player is in an active game
**When** they tap "Resign"
**Then** a confirmation dialog appears
**And** on confirmation, a resign action is sent to the complete-game Edge Function
**And** the game ends with status `'resign'` and the opponent wins
**And** a `resign` event is broadcast to the opponent

**Given** a player is in an active game
**When** they tap "Offer Draw"
**Then** a `draw_offer` event is broadcast to the opponent
**And** the opponent sees accept/decline buttons

**Given** a draw offer has been sent
**When** the opponent accepts
**Then** a `draw_accept` event is broadcast
**And** the complete-game Edge Function records status `'draw'`

**Given** a draw offer has been sent
**When** 60 seconds pass or the offering player makes their next move
**Then** the draw offer expires
**And** a `draw_offer_expired` event is broadcast
**And** the draw offer UI is cleared on both clients

**Given** a player is in an active game
**When** they tap "Request Takeback"
**Then** a `takeback_request` event is broadcast to the opponent
**And** the opponent sees accept/decline buttons

**Given** a takeback request has been sent
**When** the opponent accepts
**Then** the server verifies `move_history.length` has not changed since the request
**And** if valid, the last move is removed from `move_history` and `fen` is recalculated
**And** a `takeback_accept` event is broadcast and both clients undo the last move

**Given** a takeback request has been sent
**When** 30 seconds pass or either player makes a move
**Then** the takeback request expires
**And** a `takeback_expired` event is broadcast

### Story 3.8: Rematch Flow

As a player who just finished a game,
I want to request a rematch with my opponent,
So that we can play again quickly without going back to the lobby.

**Acceptance Criteria:**

**Given** a game has ended and the result banner is displayed
**When** a player taps "Rematch"
**Then** a rematch request is sent to the opponent via Broadcast
**And** the opponent sees an "Accept Rematch" button on their result banner

**Given** a rematch request has been sent
**When** the opponent accepts
**Then** a new game is created with the same time control and rated/casual setting
**And** colors are swapped (red becomes blue and vice versa)
**And** both players are navigated to the new game page

**Given** a rematch request has been sent
**When** the opponent declines or navigates away
**Then** the requesting player is notified that the rematch was declined
**And** they can return to the lobby or dashboard

### Story 3.9: Reconnection & Disconnect Handling

As a player who loses connection during a game,
I want to be automatically reconnected with my game state preserved,
So that I don't lose the game due to a temporary network issue.

**Acceptance Criteria:**

**Given** a player loses their WebSocket connection during a game
**When** the disconnect is detected
**Then** a "Reconnecting..." banner appears at the top of the screen
**And** the board greys out slightly but remains visible (position preserved)
**And** the client attempts to reconnect with exponential backoff

**Given** a player disconnects from the game channel
**When** the server detects the presence leave
**Then** `disconnect_at` is recorded in `game_states`
**And** both players' clocks are paused server-side

**Given** a disconnected player's network recovers
**When** the WebSocket reconnects
**Then** the client re-fetches `game_states` from the database
**And** replays `move_history` from `DEFAULT_POSITION` to reconstruct board state
**And** restores clock values from the server
**And** re-subscribes to the game Broadcast channel
**And** `disconnect_at` is cleared in `game_states`
**And** full state is restored within 5 seconds of network recovery (NFR9)
**And** the "Reconnecting..." banner disappears

**Given** a player has been disconnected for more than 60 seconds
**When** the Supabase cron job runs (every 15 seconds)
**Then** the game is forfeited via the complete-game Edge Function with status `'timeout'`
**And** a "disconnection forfeit" status is visible to both players (NFR10)

**Given** both players disconnect simultaneously
**When** the cron job checks
**Then** the game is forfeited for whichever player disconnected first (earliest `disconnect_at`)

### Story 3.10: Game Abandonment & Cleanup

As a platform operator,
I want abandoned games cleaned up and game channels secured,
So that the system stays healthy and players can only interact with their own games.

**Acceptance Criteria:**

**Given** a player closes their browser during a game without resigning
**When** the disconnection is detected
**Then** the game follows the disconnect/forfeit flow from Story 3.9
**And** the game record includes a distinct abandonment indicator separate from disconnection forfeits (FR33)

**Given** a game has `status = 'started'` and `updated_at` is older than 24 hours
**When** the Supabase cron job runs
**Then** the game status is set to `'aborted'`
**And** no rating changes are applied for aborted games

**Given** Supabase Realtime channel authorization is configured
**When** a client attempts to send or receive on a `game:{gameId}` Broadcast channel
**Then** only the two game participants (matching `games.red_player` / `games.blue_player`) are allowed
**And** unauthorized clients are rejected by RLS for Realtime policies

## Epic 4: Find an Opponent

Players can create open challenges with Rapid time control presets and publish them to the lobby, browse and accept open challenges, send friend challenges directly, and generate shareable invite links. Users who sign up via an invite link are automatically connected as friends with the inviter.

### Story 4.1: Create & Browse Open Challenges (Lobby)

As a player,
I want to create an open challenge or browse and accept existing challenges in the lobby,
So that I can find an opponent and start a game quickly.

**Acceptance Criteria:**

**Given** an authenticated player navigates to `/play`
**When** the page loads
**Then** the lobby page displays a list of open challenges from the `game_invitations` table (where `to_user IS NULL`)
**And** each challenge shows the creator's display name, rating, time control preset, and rated/casual flag
**And** the lobby subscribes to Postgres Changes on `game_invitations` for live updates

**Given** a player wants to create an open challenge
**When** they select a Rapid time control preset and rated/casual option and submit
**Then** a `game_invitations` row is created via Server Action with `to_user = NULL` (FR13)
**And** the challenge appears in the lobby for all other authenticated users
**And** the creator sees their pending challenge with a cancel option

**Given** a player sees an open challenge in the lobby
**When** they tap "Accept"
**Then** the `game_invitations` row is updated via Server Action (accepted)
**And** a new game is created (games + game_states atomically, per Story 3.2)
**And** both players are navigated to the game page

**Given** a challenge is accepted or cancelled
**When** the status changes in the database
**Then** the challenge disappears from all lobby views within 1 second (NFR7)

**Given** a player has an active open challenge
**When** they tap "Cancel"
**Then** the `game_invitations` row is deleted or marked cancelled
**And** the challenge is removed from the lobby

**Given** the lobby page is loading
**When** data is being fetched
**Then** skeleton screens are shown for the challenge list

### Story 4.2: Friend Challenge

As a player,
I want to send a game challenge directly to a specific friend,
So that I can play with someone I know without using the public lobby.

**Acceptance Criteria:**

**Given** a player wants to challenge a friend
**When** they send a friend challenge (from the friends list or play page)
**Then** a `game_invitations` row is created with `to_user` set to the friend's ID (FR15)
**And** the friend sees the incoming challenge via Postgres Changes subscription

**Given** a friend receives a challenge
**When** they view the challenge notification
**Then** they see the challenger's display name, rating, time control, and rated/casual flag
**And** they can accept or decline

**Given** a friend accepts the challenge
**When** they tap "Accept"
**Then** a new game is created and both players are navigated to the game page

**Given** a friend declines the challenge
**When** they tap "Decline"
**Then** the challenger is notified that the challenge was declined
**And** the `game_invitations` row is updated accordingly

### Story 4.3: Invite Links & Auto-Friend

As a player,
I want to generate a shareable invite link that brings a friend to the platform and automatically connects us,
So that I can grow the community by inviting people I know.

**Acceptance Criteria:**

**Given** an authenticated player wants to invite someone
**When** they generate an invite link
**Then** a `shareable_invite_links` row is created with a unique code
**And** the link is displayed in a shareable format (e.g., `cotulenh.com/invite/[code]`) with a copy button (FR16)

**Given** a new visitor clicks an invite link
**When** they navigate to `/invite/[code]`
**Then** an SSR-rendered invite landing page shows the inviter's display name and a "Sign Up" / "Sign In" CTA
**And** the page is in Vietnamese with a board visual background

**Given** a visitor signs up via the invite link
**When** account creation completes
**Then** a friendship is automatically created between the new user and the inviter (FR17)
**And** the `shareable_invite_links` row is marked as used
**And** the new user is redirected to the dashboard where they see the inviter as a friend

**Given** an already-registered user clicks an invite link
**When** they sign in
**Then** a friendship is created with the inviter if one doesn't already exist
**And** they are redirected to the dashboard

**Given** an invite link with an invalid or expired code is accessed
**When** the page loads
**Then** a friendly error message is shown in Vietnamese with a link to sign up normally

## Epic 5: Social & Friends

Players can view their own and other players' public profiles (current rating, game count, game history), manage a friends list with online/offline presence indicators, and challenge online friends directly from the friends list.

### Story 5.1: Player Profiles

As a player,
I want to view my own and other players' profiles showing their rating, game count, and history,
So that I can see my progress and learn about my opponents.

**Acceptance Criteria:**

**Given** a player navigates to `/@username` (or `/profile/[username]`)
**When** the page loads
**Then** the profile displays the player's display name, current Glicko-2 rating (or "Unrated" if no rated games), total game count, and join date
**And** a list of recent games is shown with opponent, result, and date
**And** the page is in Vietnamese

**Given** a player navigates to `/@username` via the URL
**When** Next.js Middleware processes the request
**Then** `/@username` is rewritten to `/profile/username` internally
**And** direct navigation to `/profile/username` redirects to `/@username` for canonical URL consistency

**Given** a player views their own profile
**When** the page loads
**Then** additional options are shown (e.g., link to settings)
**And** the profile data matches their authenticated session

**Given** a player views another player's profile
**When** the page loads
**Then** an "Add Friend" button is shown if they are not already friends
**And** a "Challenge" button is shown if the player is online

**Given** the profile page is loading
**When** data is being fetched
**Then** skeleton screens are displayed for all profile sections

### Story 5.2: Friends List & Online Presence

As a player,
I want to manage my friends and see who is online,
So that I can find someone to play with.

**Acceptance Criteria:**

**Given** an authenticated player navigates to `/friends`
**When** the page loads
**Then** their friends list is displayed with each friend's display name, rating, and online/offline status indicator (FR26)
**And** online friends are sorted to the top

**Given** the `(app)` layout mounts
**When** the user is authenticated
**Then** `useAuthStore` calls `track()` on the shared `online` Supabase Presence channel
**And** on unmount, `untrack()` is called

**Given** the friends page is displayed
**When** a friend comes online or goes offline
**Then** their status indicator updates in real-time
**And** `useFriendsStore` reads the shared presence state from the `online` channel to filter online friends

**Given** a player wants to add a friend
**When** they send a friend request (via profile page or username search on friends page)
**Then** a friendship request is created via the `sendFriendRequest` Server Action
**And** the request appears in the recipient's pending requests

**Given** a player has pending friend requests
**When** they view the friends page
**Then** incoming requests are shown with accept/decline buttons
**And** accepting creates a bidirectional friendship in the `friendships` table via the `create_or_accept_friendship` DB function
**And** declining removes the request

**Given** a player wants to remove a friend
**When** they tap "Remove Friend"
**Then** a confirmation dialog appears
**And** on confirmation, the friendship row is deleted via Server Action

### Story 5.3: Challenge Friends from Friends List

As a player,
I want to challenge an online friend directly from my friends list,
So that I can start a game with them in two taps.

**Acceptance Criteria:**

**Given** a player is on the friends page and a friend is online
**When** they tap the "Challenge" button next to the friend's name
**Then** a challenge dialog appears with time control preset and rated/casual options (FR27)

**Given** the player submits the challenge
**When** the challenge is created
**Then** a `game_invitations` row is created with `to_user` set to the friend's ID (reuses Epic 4 Story 4.2 flow)
**And** the friend receives the challenge notification

**Given** a friend is offline
**When** the player views the friends list
**Then** the "Challenge" button is disabled or hidden for offline friends

## Epic 6: Ratings & Leaderboard

Players earn a Glicko-2 rating for Rapid time control updated after each rated game. Players with fewer than 30 rated games are flagged as provisional. Rating change (gain/loss delta) is displayed immediately after a rated game. An activity leaderboard ranks players by games played in the current month.

### Story 6.1: Glicko-2 Rating System

As a player,
I want to earn a rating that reflects my skill level and updates after each rated game,
So that I can track my improvement and play against similarly skilled opponents.

**Acceptance Criteria:**

**Given** a new `ratings` migration is applied
**When** the migration runs
**Then** the `ratings` table exists with columns for player ID, time control, rating, rating deviation, volatility, games played count, and timestamps
**And** RLS policies allow players to read any rating but only service role can write

**Given** the Glicko-2 algorithm is implemented
**When** the code is added to `@cotulenh/common`
**Then** it correctly calculates new rating, rating deviation, and volatility given two players' current ratings and a game result
**And** unit tests verify the calculation against known Glicko-2 reference outputs

**Given** a rated game ends (checkmate, resign, timeout, or draw)
**When** the complete-game Edge Function processes the result
**Then** both players' ratings are updated atomically in the same PostgreSQL transaction as the game result write (NFR11)
**And** if either the game status write or the rating update fails, the entire transaction rolls back
**And** a new `ratings` row is created for a player if they have no existing rating (default: 1500 rating, 350 RD)

**Given** a player has completed fewer than 30 rated games
**When** their rating is displayed anywhere on the platform
**Then** a provisional indicator (e.g., "?" suffix) is shown next to their rating (FR19)

**Given** a casual game ends
**When** the result is processed
**Then** no rating changes are applied

### Story 6.2: Post-Game Rating Display

As a player,
I want to see how my rating changed immediately after a rated game,
So that I know the impact of the game on my ranking.

**Acceptance Criteria:**

**Given** a rated game has ended
**When** the game result banner is displayed
**Then** both players see their rating change as a delta (e.g., "1492 -> 1504 (+12)" in green for gains, "1492 -> 1484 (-8)" in red for losses) (FR20)
**And** the new rating is fetched from the server after the complete-game Edge Function completes

**Given** a rated game ends in a draw
**When** the result banner is displayed
**Then** both players see their rating change (which may be positive, negative, or zero depending on RD and opponent rating)

**Given** a casual game has ended
**When** the result banner is displayed
**Then** no rating change is shown
**And** ratings are not mentioned in the result banner

### Story 6.3: Activity Leaderboard

As a player,
I want to see a leaderboard of the most active players this month,
So that I feel part of a community and have motivation to play more.

**Acceptance Criteria:**

**Given** an authenticated player navigates to `/leaderboard`
**When** the page loads
**Then** a leaderboard is displayed ranking players by number of games played in the current calendar month (FR21)
**And** each row shows rank, display name, games played this month, and current rating
**And** the current user's row is highlighted if they appear on the leaderboard

**Given** the leaderboard data is queried
**When** the results are returned
**Then** only completed games (not aborted) are counted
**And** the leaderboard is sorted by games played descending

**Given** the leaderboard page is loading
**When** data is being fetched
**Then** skeleton screens are shown for the table

**Given** a player is on mobile
**When** the leaderboard renders
**Then** the layout is responsive — compact list or card view on small screens, table on desktop

## Epic 7: Game History & Review

Players can view a list of their completed games with opponent, result, and rating change. They can replay any completed game move-by-move and export the move record in PGN format.

### Story 7.1: Game History List

As a player,
I want to see a list of my completed games with key details,
So that I can track my results and find games I want to review.

**Acceptance Criteria:**

**Given** a player views their profile or game history section
**When** the history loads
**Then** a paginated list of completed games is displayed (FR28)
**And** each entry shows opponent display name, result (win/loss/draw), method (checkmate/resign/timeout/draw/stalemate), rating change (if rated), and date
**And** the list is sorted by most recent first

**Given** a player has no completed games
**When** they view their game history
**Then** an empty state is shown with an encouraging CTA to play a game

**Given** the game history list has more entries than fit on one page
**When** the player scrolls or taps "Load More"
**Then** additional games are loaded (paginated query)

**Given** a player taps on a game in the history list
**When** the game entry is selected
**Then** they are navigated to the game review page at `/game/[id]`

### Story 7.2: Game Replay Viewer

As a player,
I want to replay a completed game move-by-move,
So that I can study the game and understand what happened at each position.

**Acceptance Criteria:**

**Given** a player navigates to `/game/[id]` for a completed game
**When** the page loads
**Then** the game page renders in review mode (not live mode)
**And** the board shows the final position via the `useBoard` hook
**And** a move list is displayed in the right panel (desktop) or tabs below (mobile)

**Given** the game is in review mode
**When** the player uses the move list navigation (forward/back buttons or clicks a move)
**Then** the board updates to show the position after the selected move (FR29)
**And** the current move is highlighted in the move list
**And** first/previous/next/last navigation controls are available

**Given** the player navigates through moves
**When** keyboard arrow keys are pressed
**Then** left arrow goes to the previous move and right arrow goes to the next move

**Given** a completed game's review page loads
**When** the game data is fetched
**Then** the `move_history` from `game_states` is used to reconstruct all positions via `CoTuLenh` engine replay from `DEFAULT_POSITION`

### Story 7.3: PGN Export

As a player,
I want to export a game's move record in PGN format,
So that I can save, share, or analyze the game externally.

**Acceptance Criteria:**

**Given** a player is on the game review page
**When** they tap the "Export PGN" button
**Then** a PGN-formatted string is generated from `@cotulenh/core`'s existing PGN export functionality (FR30)
**And** the PGN includes game metadata (players, date, result, time control)

**Given** PGN has been generated
**When** the export action completes
**Then** the player can copy the PGN to clipboard via a "Copy" button
**And** a toast confirms the copy action in Vietnamese

**Given** a player wants to download the PGN
**When** they tap "Download"
**Then** a `.pgn` file is downloaded with a filename based on players and date

## Epic 8: AI Opponent & Arena Tournaments

Players can play against an AI opponent at selectable difficulty levels for practice when no human opponents are available. Players can join time-limited arena tournaments with automatic rotating pairings and live standings updates.

**Priority:** Stretch / Concurrent - ships when ready, not MVP-blocking

### Story 8.1: AI Opponent

As a player,
I want to play against an AI opponent when no human opponents are available,
So that I can practice and experiment with strategies anytime.

**Acceptance Criteria:**

**Given** the AI engine is ready and the feature is enabled
**When** a player navigates to `/game/ai`
**Then** a difficulty selector is displayed with selectable levels (e.g., Easy, Medium, Hard)
**And** on selection, a local game starts using `@cotulenh/core` engine running client-side only (no server, no Edge Functions, no Realtime)
**And** the game uses the same board layout, deploy session, clocks, and result UX as multiplayer (reuses game page components)
**And** the AI responds to moves locally using the engine
**And** the game is always unrated (no Glicko-2 impact)

**Given** the AI engine is not yet ready
**When** a player navigates to `/game/ai` or taps "Play vs AI" anywhere on the platform
**Then** a "Coming Soon" page is displayed with a friendly Vietnamese message (e.g., "We're working hard on this feature — coming soon!")
**And** a board visual is shown in the background to maintain the platform's look and feel
**And** a CTA directs the player to the lobby to find a human opponent instead

**Given** the AI feature transitions from "coming soon" to available
**When** the feature flag or route is enabled
**Then** the "Coming Soon" content is replaced with the difficulty selector and AI game flow
**And** no user-facing announcement is needed — the feature simply becomes available

**Given** an AI game ends
**When** the result is displayed
**Then** a game result banner shows the outcome
**And** "Play Again" and "Change Difficulty" buttons are shown
**And** no rating change is displayed

### Story 8.2: Arena Tournament Lobby & Registration

As a player,
I want to browse and join arena tournaments,
So that I can compete in organized events with other players.

**Acceptance Criteria:**

**Given** a new `tournaments` migration is applied
**When** the migration runs
**Then** the `tournaments` table exists with columns for tournament ID, title, time control, start time, duration, status (upcoming/active/completed), and standings (jsonb)
**And** RLS policies allow all authenticated users to read tournaments and only service role to write

**Given** an authenticated player navigates to `/tournament`
**When** the page loads
**Then** upcoming, active, and recently completed tournaments are displayed
**And** each tournament shows title, time control, start time, duration, and participant count

**Given** a player wants to join an upcoming tournament
**When** they tap "Join"
**Then** they are registered via `joinTournament` Server Action
**And** the participant count updates in real-time via Postgres Changes

**Given** a player wants to leave a tournament they joined (before it starts)
**When** they tap "Leave"
**Then** they are unregistered via `leaveTournament` Server Action

**Given** the tournament lobby is loading
**When** data is being fetched
**Then** skeleton screens are shown for the tournament list

### Story 8.3: Arena Tournament Gameplay & Live Standings

As a tournament participant,
I want to play automatic pairings and see live standings,
So that I experience competitive, organized play with real-time results.

**Acceptance Criteria:**

**Given** a tournament's start time arrives
**When** the tournament becomes active
**Then** the tournament-pair Edge Function generates the first round pairings
**And** paired players are navigated to their game pages
**And** players with no opponent (odd count) receive a bye with 1 point awarded

**Given** a tournament game ends
**When** the result is recorded
**Then** the tournament standings are updated within 5 seconds (FR38)
**And** standings updates are broadcast to all tournament participants via Postgres Changes on the `tournaments` table
**And** the participant sees their updated score and ranking

**Given** a tournament round's games have all completed
**When** the last game ends
**Then** the tournament-pair Edge Function generates the next round pairings
**And** players are paired with opponents of similar current tournament score (Swiss-style or arena-style rotation)
**And** the new round starts immediately

**Given** the tournament duration expires
**When** the timer runs out
**Then** all active tournament games are allowed to finish
**And** final standings are calculated and displayed
**And** the tournament status transitions to `'completed'`

**Given** a participant navigates to `/tournament/[id]`
**When** the page loads
**Then** live standings are displayed showing rank, player name, score, and games played
**And** standings update in real-time as games complete
