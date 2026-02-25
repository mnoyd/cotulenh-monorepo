---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: 'complete'
completedAt: '2026-02-25'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# cotulenh-monorepo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for cotulenh-monorepo, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Visitors can create an account using email and password
FR2: Registered users can sign in with their credentials
FR3: Authenticated users can sign out from any page
FR4: Users remain authenticated across page navigations and browser sessions (cookie-based)
FR5: Users can reset their password via email
FR6: Visitors can access the learn system, local play, and board editor without creating an account
FR7: Users can set and update their display name
FR8: Users can view their own profile summary (display name, games played, win/loss record, member since)
FR9: Users can view another user's public profile and game history
FR10: Users can update account settings (email, password)
FR11: Existing app settings (sounds, move hints, theme, language) persist to the user's account when signed in
FR12: Users can search for other users by display name
FR13: Users can send a friend request to another user
FR14: Users can view their pending incoming friend requests
FR15: Users can accept or decline a friend request
FR16: Users can view their friends list with online/offline status
FR17: Users can remove a friend from their friends list
FR18: Users can send a match invitation to an online friend
FR19: Users can view their pending match invitations (sent and received)
FR20: Users can accept or decline a match invitation
FR21: Users can generate a shareable invite link for unregistered users
FR22: Users who follow an invite link are guided through signup and into the pending match
FR23: Users can cancel a sent match invitation before it is accepted
FR24: Users can select time control settings when creating a match invitation
FR25: Two authenticated users can play a realtime game of CoTuLenh against each other
FR26: When a player makes a move, the SAN is sent via Supabase Broadcast to the opponent's client
FR27: Each client validates received moves locally using @cotulenh/core; valid moves update the board, turn, clock, and history
FR28a: If a client receives an invalid/illegal SAN, the game is immediately paused and both players are notified of a move dispute
FR28b: Both players can classify the incident as a bug or cheat report with optional comments
FR28c: The dispute record (PGN, illegal move SAN, player reports) is saved to the database
FR28d: The admin resolves disputes manually via Supabase dashboard (review PGN, replay locally, assign game result)
FR29: The game enforces all CoTuLenh rules (including deploy sessions, stay captures, air defense) using the existing core engine
FR30: Players can resign a game in progress
FR31: The system detects game completion (checkmate, stalemate, commander captured, draw conditions) and records the result
FR32: Chess clocks synchronize between players and enforce time controls
FR33: Players can see current game status (whose turn, move count, clock time) during play
FR34: On game completion, the full game is saved as PGN to the database (including headers, moves, result, clock data)
FR35: Users can view a list of their past games with opponent, result, date, and duration
FR36: Users can load and replay a completed game move-by-move using the stored PGN
FR37: Users can navigate forward and backward through a completed game's moves
FR38: Authenticated users' learn progress is saved to their account in the database
FR39: Learn progress syncs across devices when users are signed in
FR40: When a visitor with local learn progress signs up, their existing progress is migrated to their account
FR41: The learn system continues to function for unauthenticated users using localStorage
FR42: Star ratings, lesson completion status, and subject unlock state are all persisted
FR43: Users can submit feedback from any page via an in-app feedback button
FR44: Feedback submissions automatically capture contextual information (current page URL, browser, device, screen size)
FR45: Submitted feedback is stored and accessible to the admin
FR46: The application supports SSR for landing/public pages and SPA navigation for authenticated experiences
FR47: All new user-facing features support English and Vietnamese (existing i18n system)
FR48: The application works on modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge)

### NonFunctional Requirements

NFR1: Page initial load completes within 2 seconds on a 4G mobile connection
NFR2: SPA route transitions complete within 300ms with no full page reload
NFR3: Move broadcast latency (player action to opponent's board update) under 500ms on reasonable connections
NFR4: The game board renders and remains interactive at 60fps on mid-range mobile devices
NFR5: Client memory usage stays under 100MB during extended gameplay sessions (no leaks from realtime subscriptions or board re-renders)
NFR6: The application loads and functions without blocking the main thread for more than 50ms (no UI jank)
NFR7: Non-critical assets (learn system, game history) are lazy-loaded and do not impact initial page load
NFR8: All data in transit is encrypted via HTTPS/WSS
NFR9: User passwords are never stored in plaintext (handled by Supabase Auth with bcrypt)
NFR10: Database access is controlled via Supabase Row Level Security — users can only read/write their own data and public profiles
NFR11: Authentication tokens are stored in HTTP-only cookies, not localStorage (prevents XSS token theft)
NFR12: User-generated content (display names, feedback text) is sanitized to prevent XSS
NFR13: Game integrity is protected by client-side validation — illegal moves trigger dispute flow, not silent acceptance
NFR14: Game state (PGN) is persisted to the database on completion — no game results are lost due to client disconnection
NFR15: If a player's connection drops during a game, they can reconnect and resume from the last known state
NFR16: Learn progress writes are idempotent — duplicate syncs do not corrupt data
NFR17: The feedback system degrades gracefully — if submission fails, the user is notified and can retry
NFR18: Supabase Realtime channel disconnections are detected and auto-reconnected with exponential backoff

### Additional Requirements

From Architecture:

- Switch `adapter-static` to `adapter-vercel` for Vercel deployment with SSR support
- Install and configure `@supabase/supabase-js` and `@supabase/ssr` packages
- Set up Supabase project and local dev environment (`supabase/config.toml`, CLI)
- Create all database migrations via Supabase CLI (`supabase/migrations/`)
- Configure `hooks.server.ts` for session validation and `+layout.server.ts` for session passing
- Set up environment variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`)
- Implement RLS policies on all 7 tables (profiles, friendships, games, game_invitations, disputes, learn_progress, feedback)
- Implement typed `GameMessage` discriminated union for all Broadcast communication
- Implement move reliability via `seq` counter + `ack` system with 3s retry
- Implement lag compensation with `sentAt` timestamp and quota system (500ms max, 100ms regen per move)
- Implement `LagTracker` class as separate testable unit
- Upgrade existing `ChessClockState` to delta-based timing (`Date.now()` elapsed instead of fixed 100ms decrements)
- Add `visibilitychange` handler for background tab clock accuracy
- Implement `OnlineGameSession` composing existing `GameSession` (not replacing)
- Implement game lifecycle states (started → checkmate/resign/timeout/stalemate/draw/abort/dispute) with optimistic concurrency on game result writes
- Implement Claim Victory button (not auto-forfeit) for timeout wins
- Implement NoStart timeout (30s for first move, else abort)
- Implement draw offer + timeout interaction rule (pending draw + flag = draw)
- Implement rematch flow via GameMessage events
- Implement reconnect sync via `sync` message with FEN, PGN, clocks, and seq number
- Create Supabase browser client singleton and server client factory (`$lib/supabase/`)
- Generate and maintain Supabase TypeScript types (`$lib/types/database.ts`)
- Evaluate and improve existing code when touching it (brownfield refactoring guideline)
- All new i18n strings in both English and Vietnamese

### FR Coverage Map

FR1: Epic 1 — Visitors can create an account using email and password
FR2: Epic 1 — Registered users can sign in with their credentials
FR3: Epic 1 — Authenticated users can sign out from any page
FR4: Epic 1 — Users remain authenticated across page navigations and browser sessions (cookie-based)
FR5: Epic 1 — Users can reset their password via email
FR6: Epic 1 — Visitors can access the learn system, local play, and board editor without creating an account
FR7: Epic 2 — Users can set and update their display name
FR8: Epic 2 — Users can view their own profile summary (display name, games played, win/loss record, member since)
FR9: Epic 2 — Users can view another user's public profile and game history
FR10: Epic 2 — Users can update account settings (email, password)
FR11: Epic 2 — Existing app settings persist to the user's account when signed in
FR12: Epic 3 — Users can search for other users by display name
FR13: Epic 3 — Users can send a friend request to another user
FR14: Epic 3 — Users can view their pending incoming friend requests
FR15: Epic 3 — Users can accept or decline a friend request
FR16: Epic 3 — Users can view their friends list with online/offline status
FR17: Epic 3 — Users can remove a friend from their friends list
FR18: Epic 4 — Users can send a match invitation to an online friend
FR19: Epic 4 — Users can view their pending match invitations (sent and received)
FR20: Epic 4 — Users can accept or decline a match invitation
FR21: Epic 4 — Users can generate a shareable invite link for unregistered users
FR22: Epic 4 — Users who follow an invite link are guided through signup and into the pending match
FR23: Epic 4 — Users can cancel a sent match invitation before it is accepted
FR24: Epic 4 — Users can select time control settings when creating a match invitation
FR25: Epic 5 — Two authenticated users can play a realtime game of CoTuLenh against each other
FR26: Epic 5 — When a player makes a move, the SAN is sent via Supabase Broadcast to the opponent's client
FR27: Epic 5 — Each client validates received moves locally using @cotulenh/core
FR28a: Epic 5 — Invalid/illegal SAN triggers move dispute with game pause
FR28b: Epic 5 — Both players can classify the incident as a bug or cheat report
FR28c: Epic 5 — The dispute record is saved to the database
FR28d: Epic 5 — Admin resolves disputes manually via Supabase dashboard
FR29: Epic 5 — The game enforces all CoTuLenh rules using the existing core engine
FR30: Epic 5 — Players can resign a game in progress
FR31: Epic 5 — The system detects game completion and records the result
FR32: Epic 5 — Chess clocks synchronize between players and enforce time controls
FR33: Epic 5 — Players can see current game status during play
FR34: Epic 5 — On game completion, the full game is saved as PGN to the database
FR35: Epic 6 — Users can view a list of their past games
FR36: Epic 6 — Users can load and replay a completed game move-by-move
FR37: Epic 6 — Users can navigate forward and backward through a completed game's moves
FR38: Epic 7 — Authenticated users' learn progress is saved to their account in the database
FR39: Epic 7 — Learn progress syncs across devices when users are signed in
FR40: Epic 7 — Visitor with local learn progress signs up, progress is migrated
FR41: Epic 7 — The learn system continues to function for unauthenticated users using localStorage
FR42: Epic 7 — Star ratings, lesson completion status, and subject unlock state are all persisted
FR43: Epic 8 — Users can submit feedback from any page via an in-app feedback button
FR44: Epic 8 — Feedback submissions automatically capture contextual information
FR45: Epic 8 — Submitted feedback is stored and accessible to the admin
FR46: Epic 1 — The application supports SSR for landing/public pages and SPA navigation
FR47: Cross-cutting — All new user-facing features support English and Vietnamese
FR48: Cross-cutting — The application works on modern desktop and mobile browsers

## Epic List

### Epic 1: Supabase Foundation & Authentication

Users can create accounts, sign in/out, maintain persistent sessions, and reset their password. Visitors can still access the learn system, local play, and board editor without an account. The platform supports SSR for public pages and SPA navigation for authenticated experiences.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR46
**NFRs addressed:** NFR1, NFR2, NFR7, NFR8, NFR9, NFR10, NFR11
**Additional requirements:**

- Switch `adapter-static` to `adapter-vercel`
- Install and configure `@supabase/supabase-js` and `@supabase/ssr`
- Set up Supabase project and local dev environment (`supabase/config.toml`, CLI)
- Create migrations framework (`supabase/migrations/`)
- Configure `hooks.server.ts` for session validation
- Configure `+layout.server.ts` for session passing to all pages
- Set up environment variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`)
- Create Supabase browser client singleton and server client factory (`$lib/supabase/`)
- Generate Supabase TypeScript types (`$lib/types/database.ts`)
- Create `profiles` table with RLS (basic — display_name, created_at)
- Auth callback route (`/auth/callback`)
- Auth-aware root layout (user menu vs login link)

**Dependencies:** None (standalone foundation)

---

### Epic 2: User Profiles & Settings

Users can set and update their display name, view their own profile summary (display name, games played, win/loss record, member since), view other users' public profiles, update account settings (email, password), and have their app settings (sounds, move hints, theme, language) persist to their account.

**FRs covered:** FR7, FR8, FR9, FR10, FR11
**NFRs addressed:** NFR12
**Additional requirements:**

- Enhance `profiles` table (settings_json, avatar_url, locale)
- RLS policies for profiles (public read, owner update)
- Evaluate existing settings system (`settings.ts`, `persisted.svelte.ts`) for Supabase-backed migration

**Dependencies:** Epic 1

---

### Epic 3: Social & Friends

Users can search for other players by display name, send and manage friend requests, view their friends list with online/offline status indicators, and remove friends.

**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17
**Additional requirements:**

- Create `friendships` table + RLS policies
- Presence channel (`lobby`) for online/offline status
- `$lib/friends/` module (queries, types)

**Dependencies:** Epics 1, 2

---

### Epic 4: Match Invitations & Game Setup

Users can invite an online friend to a match with time control settings, view and manage pending invitations (sent and received), share invite links with unregistered users who get guided through signup into the pending match, and cancel sent invitations.

**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR23, FR24
**Additional requirements:**

- Create `game_invitations` table + RLS policies
- Postgres Changes subscription for real-time invitation notifications
- Invite link route (`/play/online/invite/[code]`) — public
- `game_config` JSON schema for time controls

**Dependencies:** Epic 3

---

### Epic 5: Realtime Online Gameplay

Two players can play a full realtime game of CoTuLenh — moves sync instantly via Broadcast, clocks tick accurately with lag compensation, the game enforces all CoTuLenh rules (deploy sessions, stay captures, air defense), and handles all end conditions (checkmate, resign, timeout, stalemate, draw, abort, disputes). Players can reconnect after disconnection, request rematch, and all completed games are saved as PGN.

**FRs covered:** FR25, FR26, FR27, FR28a, FR28b, FR28c, FR28d, FR29, FR30, FR31, FR32, FR33, FR34
**NFRs addressed:** NFR3, NFR4, NFR5, NFR6, NFR13, NFR14, NFR15, NFR18
**Additional requirements:**

- Create `games` table + RLS policies (public reads for completed games)
- Create `disputes` table + RLS policies
- Implement typed `GameMessage` discriminated union
- Implement `OnlineGameSession` composing existing `GameSession` (not replacing)
- Implement move reliability via `seq` counter + `ack` system with 3s retry
- Implement `LagTracker` class (lag compensation + quota: 500ms max, 100ms regen/move)
- Upgrade existing `ChessClockState` to delta-based timing (`Date.now()` elapsed)
- Add `visibilitychange` handler for background tab clock accuracy
- Implement game lifecycle states with optimistic concurrency on result writes
- Implement Claim Victory button (not auto-forfeit) for timeout wins
- Implement NoStart timeout (30s for first move, else abort)
- Implement draw offer + timeout interaction rule (pending draw + flag = draw)
- Implement reconnect sync via `sync` message
- Implement rematch flow via GameMessage events

**Dependencies:** Epic 4

---

### Epic 6: Game History & Review

Users can browse their past games (opponent, result, date, duration) and replay any completed game move-by-move with forward/backward navigation.

**FRs covered:** FR35, FR36, FR37
**Additional requirements:**

- Leverages existing `@cotulenh/core` PGN support and `GameSession` history navigation
- Game list page (`/user/history`) and replay page (`/user/history/[gameId]`)
- Public game history on user profiles (`/user/profile/[username]`)

**Dependencies:** Epic 5

---

### Epic 7: Learn Progress Persistence

Authenticated users' learn progress saves to their account and syncs across devices. When a visitor with local learn progress signs up, their existing progress migrates automatically to their account. Anonymous users continue using localStorage as before.

**FRs covered:** FR38, FR39, FR40, FR41, FR42
**NFRs addressed:** NFR16
**Additional requirements:**

- Create `learn_progress` table + RLS policies
- Update existing `learn-progress.svelte.ts` with Supabase sync
- Upsert semantics (`ON CONFLICT DO UPDATE`) for idempotent writes

**Dependencies:** Epic 1 (parallel track — independent of Epics 2-6)

---

### Epic 8: Feedback System

Users can submit feedback from any page via an in-app button. Contextual information (page URL, browser, device, screen size) is captured automatically. Admin reviews all feedback via Supabase dashboard.

**FRs covered:** FR43, FR44, FR45
**NFRs addressed:** NFR17
**Additional requirements:**

- Create `feedback` table + RLS policies
- `$lib/feedback/submit.ts` helper
- Feedback button in root layout (available on all pages)
- `context_json` shape for browser/device context

**Dependencies:** Epic 1 (parallel track — independent of Epics 2-7)

---

### Cross-Cutting Concerns (all epics)

- **FR47:** All new user-facing strings in both English and Vietnamese (i18n)
- **FR48:** Works on modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge)
- **Brownfield refactoring:** Evaluate and improve existing code when touching it
- **All 10 enforcement rules** from architecture apply to every story

### Dependency Graph

```
Epic 1: Foundation & Auth          (standalone)
  ├── Epic 2: Profiles & Settings  (needs Epic 1)
  │     └── Epic 3: Social & Friends (needs Epics 1, 2)
  │           └── Epic 4: Match Invitations (needs Epic 3)
  │                 └── Epic 5: Online Gameplay (needs Epic 4)
  │                       └── Epic 6: Game History (needs Epic 5)
  ├── Epic 7: Learn Progress       (needs Epic 1 only — parallel track)
  └── Epic 8: Feedback             (needs Epic 1 only — parallel track)
```

---

## Epic 1 Stories: Supabase Foundation & Authentication

### Story 1.1: User Registration

As a visitor,
I want to create an account with my email and password,
So that I can access online features of the platform.

**Implementation scope:** This is the foundational story — includes Supabase project setup (adapter-vercel switch, `@supabase/supabase-js` + `@supabase/ssr` installation, `supabase/config.toml`, env vars), `hooks.server.ts` for session validation, `+layout.server.ts` for session passing, Supabase browser client singleton + server client factory (`$lib/supabase/`), generated TypeScript types, `profiles` table migration with RLS, `/auth/register` page, and `/auth/callback` server route.

**Acceptance Criteria:**

**Given** a visitor on the registration page
**When** they enter a valid email and password and submit
**Then** an account is created via Supabase Auth, a `profiles` row is auto-created, and they are redirected to the home page as an authenticated user

**Given** a visitor attempts to register with an already-used email
**When** they submit the form
**Then** they see an appropriate error message (i18n: en + vi)

**Given** a visitor submits a weak password (less than 8 characters)
**When** they submit the form
**Then** they see a validation error before the form is sent

**Given** the Supabase infrastructure is configured
**When** the app starts in development
**Then** `hooks.server.ts` validates session cookies on every request and attaches user to `event.locals`

**Given** the adapter is switched to `adapter-vercel`
**When** the app builds
**Then** SSR works for public pages and SPA navigation works for authenticated routes (FR46)

---

### Story 1.2: User Login & Persistent Sessions

As a registered user,
I want to sign in with my email and password and stay logged in across page navigations,
So that I don't have to re-authenticate every time I visit.

**Acceptance Criteria:**

**Given** a registered user on the login page
**When** they enter valid credentials and submit
**Then** they are authenticated, a session cookie is set, and they are redirected to the home page

**Given** a user enters incorrect credentials
**When** they submit the login form
**Then** they see an error message (not revealing whether email or password was wrong)

**Given** a logged-in user navigates between pages or closes and reopens the browser
**When** they return to the site
**Then** they remain authenticated (cookie-based session persistence, FR4)

**Given** a user was trying to access a protected page before login
**When** they successfully log in
**Then** they are redirected to their originally intended page (not just home)

---

### Story 1.3: Auth-Aware Navigation & Logout

As an authenticated user,
I want to see my identity in the navigation and sign out from any page,
So that I can manage my session and visitors can still access public features.

**Acceptance Criteria:**

**Given** an authenticated user on any page
**When** the page renders
**Then** the navigation shows their display name (or email fallback) and a sign-out option

**Given** an authenticated user clicks sign out
**When** the action completes
**Then** the session is destroyed, the cookie is cleared, and they are redirected to the home page (FR3)

**Given** a visitor (not logged in) navigates to `/learn/*`, `/play`, or `/board-editor`
**When** the page loads
**Then** they can access these features without being redirected to login (FR6)

**Given** a visitor navigates to a protected route (`/user/*`, `/play/online/*`)
**When** the page loads
**Then** they are redirected to `/auth/login` with a return URL parameter

**Given** the navigation layout
**When** rendered on mobile and desktop
**Then** the auth-aware UI is responsive and follows existing layout patterns

---

### Story 1.4: Password Reset Flow

As a user who forgot their password,
I want to request a password reset via email and set a new password,
So that I can regain access to my account.

**Acceptance Criteria:**

**Given** a user on the `/auth/forgot-password` page
**When** they enter their registered email and submit
**Then** Supabase sends a password reset email with a magic link

**Given** a user clicks the reset link in their email
**When** they land on `/auth/reset-password`
**Then** they see a form to enter their new password

**Given** a user enters a valid new password on the reset page
**When** they submit
**Then** their password is updated and they are redirected to the login page with a success message

**Given** a user enters an unregistered email on the forgot-password page
**When** they submit
**Then** they see the same "check your email" message (no email enumeration)

---

## Epic 2 Stories: User Profiles & Settings

### Story 2.1: Display Name & Own Profile

As an authenticated user,
I want to set my display name and view my profile summary,
So that I have an identity on the platform and can see my stats.

**Implementation scope:** Enhance `profiles` table migration (add `settings_json`, `avatar_url`, `locale` columns), profile page at `/user/profile`, display name setup (prompted on first login or accessible via profile), profile summary showing display name, member since, games played, win/loss record (games played/win/loss will be 0 until Epic 5 — that's fine, the UI is ready).

**Acceptance Criteria:**

**Given** a newly registered user who hasn't set a display name
**When** they visit `/user/profile`
**Then** they are prompted to set a display name

**Given** an authenticated user on their profile page
**When** the page loads
**Then** they see their display name, member since date, and game statistics (games played, wins, losses — defaulting to 0)

**Given** a user wants to change their display name
**When** they edit and save their display name
**Then** the `profiles` table is updated and the new name appears immediately (FR7)

**Given** a user enters a display name with HTML/script tags
**When** they submit
**Then** the input is sanitized before storage (NFR12)

---

### Story 2.2: Public User Profiles

As a user,
I want to view another user's public profile and game history,
So that I can learn about other players on the platform.

**Acceptance Criteria:**

**Given** any user (authenticated or visitor) navigates to `/user/profile/[username]`
**When** the page loads
**Then** they see the target user's display name, member since date, and game statistics (FR9)

**Given** a user navigates to a profile for a username that doesn't exist
**When** the page loads
**Then** they see a "user not found" message

**Given** the public profile page
**When** rendered
**Then** it shows a placeholder section for game history (populated when Epic 6 is complete)

---

### Story 2.3: Account Settings

As an authenticated user,
I want to update my email, password, and app preferences,
So that I can manage my account and have my settings persist across devices.

**Implementation scope:** `/user/settings` page with sections for account (email, password change) and app preferences. Evaluate existing `settings.ts` and `persisted.svelte.ts` — migrate app settings (sounds, move hints, theme, language) to `profiles.settings_json` so they sync across devices when signed in. localStorage remains as cache/fallback for anonymous users.

**Acceptance Criteria:**

**Given** an authenticated user on the settings page
**When** they change their email and submit
**Then** Supabase Auth updates their email (with verification if required) (FR10)

**Given** an authenticated user on the settings page
**When** they change their password (entering current + new password) and submit
**Then** their password is updated via Supabase Auth (FR10)

**Given** an authenticated user changes app settings (sounds, move hints, theme, language)
**When** they toggle a setting
**Then** the setting is saved to `profiles.settings_json` in the database AND localStorage (FR11)

**Given** an authenticated user logs in on a new device
**When** the app loads
**Then** their app settings are loaded from `profiles.settings_json` and applied (FR11)

**Given** a visitor (not logged in) changes app settings
**When** they toggle a setting
**Then** the setting is saved to localStorage only (existing behavior preserved)

---

## Epic 3 Stories: Social & Friends

### Story 3.1: User Search & Send Friend Request

As an authenticated user,
I want to search for other players by display name and send them a friend request,
So that I can connect with people I want to play with.

**Implementation scope:** Create `friendships` table migration + RLS policies, `/user/friends` page with search UI, `$lib/friends/` module (queries, types), search query against `profiles.display_name`.

**Acceptance Criteria:**

**Given** an authenticated user on the friends page
**When** they type a display name in the search field
**Then** they see matching users (partial match, case-insensitive) with their display name and a "Send Request" button (FR12)

**Given** a user finds someone in search results
**When** they click "Send Request"
**Then** a `friendships` row is created with `status = 'pending'` and `initiated_by` set to the sender (FR13)

**Given** a user searches for someone they've already sent a request to
**When** the results load
**Then** the button shows "Pending" instead of "Send Request"

**Given** a user searches for someone who is already their friend
**When** the results load
**Then** the button shows "Friends" instead of "Send Request"

**Given** a user tries to send a friend request to themselves
**When** they attempt the action
**Then** it is prevented (no self-friending)

---

### Story 3.2: Friend Request Management

As an authenticated user,
I want to view my incoming friend requests and accept or decline them,
So that I can control who is on my friends list.

**Acceptance Criteria:**

**Given** an authenticated user on the friends page
**When** the page loads
**Then** they see a section showing pending incoming friend requests with sender's display name and Accept/Decline buttons (FR14)

**Given** a user clicks "Accept" on an incoming request
**When** the action completes
**Then** the `friendships` row is updated to `status = 'accepted'` and both users see each other on their friends list (FR15)

**Given** a user clicks "Decline" on an incoming request
**When** the action completes
**Then** the `friendships` row is deleted and the request disappears (FR15)

**Given** a user has no pending requests
**When** the page loads
**Then** the pending requests section shows an empty state message

---

### Story 3.3: Friends List with Online Status

As an authenticated user,
I want to see my friends list with who's currently online,
So that I can find someone available to play.

**Implementation scope:** Supabase Presence channel (`lobby`) — authenticated users subscribe on login, unsubscribe on logout. Friends list UI showing online/offline indicators. Remove friend functionality.

**Acceptance Criteria:**

**Given** an authenticated user on the friends page
**When** the page loads
**Then** they see their complete friends list with display names and online/offline indicators (FR16)

**Given** a friend comes online (joins the `lobby` Presence channel)
**When** the Presence state updates
**Then** their indicator updates to "online" in real-time without page refresh

**Given** a friend goes offline (leaves the `lobby` Presence channel)
**When** the Presence state updates
**Then** their indicator updates to "offline"

**Given** a user wants to remove a friend
**When** they click "Remove" on a friend and confirm
**Then** the `friendships` row is deleted and the friend disappears from both users' lists (FR17)

**Given** an authenticated user logs in
**When** the app initializes
**Then** they automatically join the `lobby` Presence channel (making them visible as online to their friends)

---

## Epic 4 Stories: Match Invitations & Game Setup

### Story 4.1: Send Match Invitation to Friend

As an authenticated user,
I want to invite an online friend to a match with time control settings,
So that we can start a game together.

**Implementation scope:** Create `game_invitations` table migration + RLS policies, `/play/online` page (lobby/invite UI), time control selector (e.g., 5+0, 10+0, 15+10, custom), `game_config` JSON schema. Integration with friends list from Epic 3 — show online friends with "Invite" button.

**Acceptance Criteria:**

**Given** an authenticated user on the online play page
**When** the page loads
**Then** they see their online friends with an "Invite" button next to each (FR18)

**Given** a user selects time control settings and clicks "Invite" on a friend
**When** the action completes
**Then** a `game_invitations` row is created with `status = 'pending'`, the selected `game_config`, and an auto-generated `invite_code` (FR18, FR24)

**Given** a user has already sent a pending invitation to a friend
**When** they view that friend
**Then** the button shows "Invited" instead of "Invite"

**Given** the time control selector
**When** a user configures it
**Then** they can choose from presets (5+0, 10+0, 15+10) or set custom minutes + increment (FR24)

---

### Story 4.2: View & Respond to Match Invitations

As an authenticated user,
I want to see my pending match invitations and accept or decline them,
So that I can join games my friends want to play.

**Implementation scope:** Postgres Changes subscription on `game_invitations` (where `to_user = me`) in root layout for real-time notification. Invitation list UI on `/play/online`. Accept creates a `games` row with `status = 'started'` and redirects both players to `/play/online/[gameId]`.

**Acceptance Criteria:**

**Given** an authenticated user on any page
**When** a new match invitation is inserted for them
**Then** they receive a real-time notification (toast or badge) via Postgres Changes subscription (FR19)

**Given** an authenticated user on the online play page
**When** the page loads
**Then** they see their pending invitations (sent and received) with opponent name, time control, and Accept/Decline/Cancel buttons (FR19)

**Given** a user clicks "Accept" on a received invitation
**When** the action completes
**Then** the invitation status is updated, a `games` row is created with `status = 'started'`, and both players are navigated to `/play/online/[gameId]` (FR20)

**Given** a user clicks "Decline" on a received invitation
**When** the action completes
**Then** the invitation status is updated to `declined` and it disappears from both users' views (FR20)

**Given** a user clicks "Cancel" on a sent invitation
**When** the action completes
**Then** the invitation is deleted and removed from the recipient's view (FR23)

---

### Story 4.3: Shareable Invite Link

As an authenticated user,
I want to generate a shareable invite link for someone who doesn't have an account yet,
So that I can bring new players to the platform and play with them.

**Implementation scope:** Generate shareable URL using `invite_code` from `game_invitations`. Public route `/play/online/invite/[code]` that shows game details and guides visitors through signup → redirect back to accept the invitation.

**Acceptance Criteria:**

**Given** an authenticated user on the online play page
**When** they click "Create Invite Link" and select time controls
**Then** a `game_invitations` row is created with an `invite_code` and they see a copyable URL like `/play/online/invite/[code]` (FR21)

**Given** a visitor (not logged in) follows an invite link
**When** the page loads
**Then** they see the inviter's name, time control, and a prompt to sign up or log in (FR22)

**Given** a visitor signs up through the invite link flow
**When** registration completes
**Then** they are redirected back to the invite page, now authenticated, with an "Accept & Play" button (FR22)

**Given** a user accepts an invite link
**When** the action completes
**Then** the invitation is accepted, a game is created, and both players are directed to the game page

**Given** an invite link for an expired or cancelled invitation
**When** a visitor follows the link
**Then** they see a message that the invitation is no longer available

---

## Epic 5 Stories: Realtime Online Gameplay

### Story 5.1: Delta-Based Clock & GameMessage Types

As a player,
I want accurate chess clocks that don't drift in background tabs or under CPU load,
So that time controls are fair regardless of device or browser behavior.

**Implementation scope:** Upgrade existing `ChessClockState` to delta-based timing (`Date.now()` elapsed instead of fixed 100ms decrements). Add `visibilitychange` handler. Create `GameMessage` discriminated union type and `sendGameMessage`/handler helpers in `$lib/game/messages.ts`. Create `LagTracker` class in `$lib/game/lag-tracker.ts` with unit tests. These are testable units with no network dependency — foundation for all subsequent stories.

**Acceptance Criteria:**

**Given** the existing `ChessClockState` class
**When** upgraded to delta-based timing
**Then** each tick computes `elapsed = Date.now() - lastTick` instead of assuming 100ms, and `lastTick` is reset each tick

**Given** a game running in a background tab (browser throttles setInterval to 1/sec)
**When** the user returns to the tab (visibilitychange fires)
**Then** the clock immediately catches up by computing the full elapsed delta since the last tick

**Given** the `LagTracker` class initialized with defaults (500ms max quota, 100ms regen per move)
**When** `debit(estimatedLag)` is called
**Then** it returns `min(estimatedLag, currentQuota)` and reduces the quota accordingly

**Given** the `LagTracker` after a debit
**When** `regenerate()` is called (once per move)
**Then** the quota increases by 100ms up to the 500ms cap

**Given** the `GameMessage` type definition
**When** a developer creates a message
**Then** TypeScript enforces the correct fields for each event type (move requires san+clock+seq+sentAt, ack requires seq, etc.)

**Given** the existing local play flow
**When** a user plays a local game after the clock upgrade
**Then** the game functions identically — delta-based timing is transparent to the UI

---

### Story 5.2: Online Game Session & Move Broadcast

As a player,
I want to play a realtime game where my moves are sent to my opponent instantly,
So that we can play CoTuLenh online against each other.

**Implementation scope:** Create `games` table migration + RLS. Create `OnlineGameSession` class (`$lib/game/online-session.svelte.ts`) composing existing `GameSession`. Implement Broadcast channel (`game:{gameId}`), Presence for connection tracking, move sending (SAN + clock + seq + sentAt), move receiving with local validation via `@cotulenh/core`. Create `/play/online/[gameId]` page composing existing board components. NoStart timeout (30s).

**Acceptance Criteria:**

**Given** two players are navigated to `/play/online/[gameId]` after accepting an invitation
**When** both join the game channel
**Then** the game starts, the board shows the correct orientation for each player (red/blue), and clocks begin for the first player's turn (FR25)

**Given** a player makes a move on their board
**When** the move is valid
**Then** a `GameMessage` with `event: 'move'` (including SAN, clock, seq, sentAt) is broadcast to the opponent (FR26)

**Given** a player receives a move broadcast
**When** the SAN is validated by `@cotulenh/core`
**Then** the board updates, the turn switches, clocks update with lag compensation, and an ack is sent back (FR27)

**Given** the game page
**When** the game is in progress
**Then** both players see whose turn it is, move count, and both clock times (FR33)

**Given** neither player has moved within 30 seconds of game start
**When** the timeout fires
**Then** the game is aborted (`status = 'aborted'`) and both players are notified

**Given** the `OnlineGameSession` class
**When** inspected
**Then** it composes `GameSession` (not replaces it) — all existing game logic is reused

---

### Story 5.3: Move Reliability & Reconnection

As a player,
I want my moves to be reliably delivered even on unstable connections, and to reconnect seamlessly if I drop,
So that no moves are lost and games survive temporary disconnections.

**Implementation scope:** Implement seq counter + ack system with 3s retry. Implement Presence-based disconnect detection. Implement reconnect sync (`sync` message with FEN, PGN, clocks, seq). Implement `ReconnectBanner.svelte` component. Auto-reconnect for Supabase Realtime with exponential backoff.

**Acceptance Criteria:**

**Given** a player sends a move
**When** no ack is received within 3 seconds
**Then** the same move (same seq) is resent automatically

**Given** a player receives a duplicate seq
**When** processing the message
**Then** the duplicate is ignored (idempotent) and an ack is sent

**Given** a player receives seq=5 but their last was seq=3
**When** the gap is detected
**Then** they request a `sync` instead of processing individual moves

**Given** a player's connection drops during a game
**When** Presence fires a `leave` event (~10s)
**Then** the opponent sees a "Opponent disconnected" banner with the clock still ticking (NFR15)

**Given** a disconnected player reconnects
**When** Presence fires a `join` event
**Then** the connected player sends a `sync` message with current FEN, PGN, clocks, and seq number, and the reconnecting player loads this state

**Given** the reconnecting player receives the sync
**When** state is loaded
**Then** the banner dismisses and gameplay resumes from the correct position (NFR18)

---

### Story 5.4: Game End Conditions & Result Recording

As a player,
I want the game to detect all end conditions and save the result,
So that completed games are recorded accurately and no results are lost.

**Implementation scope:** Implement checkmate/stalemate/commander-captured/draw detection (leveraging `@cotulenh/core`), resign flow, game result writing with optimistic concurrency (`UPDATE ... WHERE status = 'started'`), PGN save on completion with headers and clock annotations.

**Acceptance Criteria:**

**Given** a move results in checkmate, stalemate, or commander capture
**When** the core engine detects the end condition
**Then** the game ends, `games` row is updated with appropriate `status` and `winner`, and the full PGN is saved (FR31, FR34)

**Given** a player clicks "Resign"
**When** they confirm
**Then** a `resign` message is broadcast, the game ends with `status = 'resign'`, `winner` set to the opponent, and PGN is saved (FR30)

**Given** both clients detect the same game end simultaneously
**When** both attempt to write the result
**Then** only one succeeds due to `WHERE status = 'started'` (optimistic concurrency), and the other client reads the saved result (NFR14)

**Given** a completed game's PGN
**When** saved to the database
**Then** it includes all headers (players, date, result, time control), move list, `[%clk]` annotations, and result token (FR34)

**Given** the game enforces CoTuLenh rules
**When** a deploy session, stay capture, or air defense scenario occurs
**Then** the existing `@cotulenh/core` engine handles it correctly in the online context (FR29)

---

### Story 5.5: Clock Timeout & Claim Victory

As a player,
I want to claim victory when my opponent's clock runs out,
So that time controls are enforced and stalling is prevented.

**Implementation scope:** Clock flag detection (0ms), Claim Victory button UI, `claim-victory` message, timeout result writing. Draw offer + timeout interaction rule (pending draw + flag = draw).

**Acceptance Criteria:**

**Given** the opponent's clock reaches 0
**When** the local player sees the flag
**Then** a "Claim Victory" button appears (not auto-forfeit)

**Given** a player clicks "Claim Victory"
**When** the action completes
**Then** a `claim-victory` message is broadcast, `games` row is updated with `status = 'timeout'` and the claiming player as `winner`

**Given** a draw offer is pending from the opponent and the opponent's clock reaches 0
**When** the flag condition is checked
**Then** the result is a draw (not timeout win) — pending draw + flag = draw

**Given** a player's own clock reaches 0
**When** the opponent hasn't claimed victory yet
**Then** the game continues until the opponent actively claims (giving maximum reconnection time)

---

### Story 5.6: Dispute System

As a player,
I want the game to pause and let me report if my opponent sends an illegal move,
So that game integrity is protected and disputes are reviewed fairly.

**Implementation scope:** Create `disputes` table migration + RLS. Implement dispute detection (invalid SAN from opponent), dispute UI (pause game, report classification), dispute record saving, admin review via Supabase dashboard.

**Acceptance Criteria:**

**Given** a player receives a SAN that `@cotulenh/core` rejects as invalid
**When** validation fails
**Then** the game is immediately paused and a `dispute` message is broadcast with the illegal SAN and current PGN (FR28a)

**Given** both players see the dispute UI
**When** they submit their classification
**Then** they can choose "bug" or "cheat" with optional comments, and a `disputes` row is saved with the PGN, illegal SAN, and both players' reports (FR28b, FR28c)

**Given** a dispute is recorded
**When** the game ends with `status = 'dispute'`
**Then** the admin can review the PGN, replay the game locally, and assign a result via Supabase dashboard (FR28d)

**Given** a dispute occurs
**When** the dispute record is saved
**Then** RLS ensures only game participants can insert and only admin can update resolution

---

### Story 5.7: Draw Offers & Rematch

As a player,
I want to offer a draw during a game and request a rematch after it ends,
So that we have sportsmanlike game flow options.

**Implementation scope:** Draw offer/accept/decline messages and UI. Rematch flow — after game ends, either player sends `rematch`, if accepted a new `game_invitations` row is created with swapped colors and same time control. Abort flow (leave before both sides have moved).

**Acceptance Criteria:**

**Given** a player during an active game
**When** they click "Offer Draw"
**Then** a `draw-offer` message is sent and the opponent sees an Accept/Decline prompt

**Given** the opponent accepts a draw offer
**When** they click "Accept"
**Then** a `draw-accept` message is sent, the game ends with `status = 'draw'`, `winner = null`, and PGN is saved

**Given** the opponent declines a draw offer
**When** they click "Decline"
**Then** a `draw-decline` message is sent and gameplay continues

**Given** a game has just ended
**When** either player clicks "Rematch"
**Then** a `rematch` message is sent and the opponent sees a "Rematch?" prompt

**Given** the opponent accepts a rematch
**When** they click "Accept"
**Then** a new `game_invitations` row is created with swapped colors and the same time control, and both players are navigated to the new game

**Given** a player leaves before both sides have made a move
**When** the abort condition is detected
**Then** the game is aborted (`status = 'aborted'`), no penalty, both players notified

---

## Epic 6 Stories: Game History & Review

### Story 6.1: Game History List

As an authenticated user,
I want to see a list of my past games,
So that I can track my play history and find games to review.

**Implementation scope:** `/user/history` page querying the `games` table (completed games where user is red_player or blue_player). Display opponent name, result, date, duration. Also show game history on public profiles (`/user/profile/[username]`).

**Acceptance Criteria:**

**Given** an authenticated user navigates to `/user/history`
**When** the page loads
**Then** they see a list of their completed games showing opponent display name, result (win/loss/draw), date, and game duration, ordered by most recent (FR35)

**Given** a user has no completed games
**When** the page loads
**Then** they see an empty state message encouraging them to play

**Given** a user views another user's public profile at `/user/profile/[username]`
**When** the page loads
**Then** the game history section shows that user's completed games (FR9 — public game history)

**Given** the game list
**When** a user clicks on a game entry
**Then** they are navigated to `/user/history/[gameId]` for replay

---

### Story 6.2: Game Replay Viewer

As a user,
I want to replay a completed game move-by-move with forward/backward navigation,
So that I can review what happened and learn from past games.

**Implementation scope:** `/user/history/[gameId]` page. Load PGN from `games` table, create a `GameSession` via `core.loadPgn(pgn)`, reuse existing `MoveHistory` component, keyboard handlers, and `historyViewIndex` navigation. Board set to `viewOnly: true`.

**Acceptance Criteria:**

**Given** a user navigates to `/user/history/[gameId]`
**When** the page loads
**Then** the game's PGN is loaded, the board shows the starting position, and the move list is displayed (FR36)

**Given** a user viewing a replayed game
**When** they click forward (or press right arrow)
**Then** the board advances one move and the current move is highlighted in the move list (FR37)

**Given** a user viewing a replayed game
**When** they click backward (or press left arrow)
**Then** the board goes back one move (FR37)

**Given** a user viewing a replayed game
**When** they click on a specific move in the move list
**Then** the board jumps to that position

**Given** the replay viewer
**When** rendered
**Then** game metadata is shown (players, result, date, time control) and the board is in view-only mode (no piece interaction)

---

## Epic 7 Stories: Learn Progress Persistence

### Story 7.1: Learn Progress Database Sync

As an authenticated user,
I want my learn progress to save to my account and sync across devices,
So that I don't lose progress when switching browsers or devices.

**Implementation scope:** Create `learn_progress` table migration + RLS. Update existing `learn-progress.svelte.ts` to detect auth state — when signed in, read/write progress from Supabase alongside localStorage (localStorage remains as local cache). Upsert semantics (`ON CONFLICT DO UPDATE`) for idempotent writes.

**Acceptance Criteria:**

**Given** an authenticated user completes a lesson
**When** progress is saved
**Then** it is written to both `learn_progress` table and localStorage (FR38)

**Given** an authenticated user opens the app on a different device
**When** the learn system loads
**Then** their progress is fetched from Supabase and applied (FR39)

**Given** an unauthenticated user completes a lesson
**When** progress is saved
**Then** it is written to localStorage only (existing behavior, FR41)

**Given** a duplicate progress write (same user, same lesson)
**When** the upsert executes
**Then** the existing row is updated, not duplicated (NFR16 — idempotent)

**Given** star ratings, lesson completion, and subject unlock state
**When** persisted
**Then** all are correctly saved and restored (FR42)

---

### Story 7.2: Learn Progress Migration on Signup

As a visitor who has been learning without an account,
I want my existing learn progress to migrate to my account when I sign up,
So that I don't lose the progress I've already made.

**Acceptance Criteria:**

**Given** a visitor has learn progress in localStorage and then creates an account
**When** registration completes and they are authenticated
**Then** all localStorage learn progress is synced to the `learn_progress` table (FR40)

**Given** the migration encounters progress that already exists in the database (edge case)
**When** the upsert runs
**Then** the higher star rating / completed status is kept (merge, don't overwrite)

**Given** the migration completes
**When** the user continues learning
**Then** new progress writes go to both Supabase and localStorage seamlessly

---

## Epic 8 Stories: Feedback System

### Story 8.1: In-App Feedback Submission

As a user,
I want to submit feedback from any page via a feedback button,
So that I can report issues or suggest improvements directly to the developer.

**Implementation scope:** Create `feedback` table migration + RLS. Create `$lib/feedback/submit.ts` helper. Add feedback button to root layout (floating button or nav item). Feedback dialog captures message + automatically collects page URL, browser, device, screen size. Works for authenticated users (user_id saved) and optionally anonymous visitors.

**Acceptance Criteria:**

**Given** a user on any page
**When** they click the feedback button
**Then** a dialog opens with a text input for their message (FR43)

**Given** a user submits feedback
**When** the form is sent
**Then** the `feedback` row includes: user_id (if authenticated), message, page_url, and `context_json` with browser, device type, and screen size (FR44)

**Given** feedback is submitted
**When** the admin views the Supabase dashboard
**Then** they can see all feedback entries with full context (FR45)

**Given** a feedback submission fails (network error)
**When** the error is caught
**Then** the user sees a notification that submission failed and can retry (NFR17)

**Given** a user submits feedback with HTML/script in the message
**When** the input is processed
**Then** it is sanitized before storage (NFR12)
