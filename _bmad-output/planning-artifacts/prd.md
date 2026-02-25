---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
classification:
  projectType: 'Web App (online board game platform, Lichess-inspired)'
  domain: 'Online competitive strategy platform (turn-based)'
  complexity: 'medium'
  projectContext: 'brownfield'
inputDocuments:
  - _bmad-output/planning-artifacts/research/technical-firebase-supabase-baas-for-sveltekit-game-research-2026-02-25.md
  - docs/Architecture.md
  - docs/ai-agent-guide/system-architecture.md
  - docs/ai-agent-guide/package-responsibilities.md
  - docs/ai-agent-guide/data-flow-patterns.md
  - docs/ai-agent-guide/api-contracts.md
  - docs/README.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 0
  projectDocs: 6
---

# Product Requirements Document - cotulenh-monorepo

**Author:** Noy
**Date:** 2026-02-25

## Executive Summary

CoTuLenh is a Vietnamese military strategy board game with an existing SvelteKit monorepo: a game engine (`cotulenh-core`), board UI (`cotulenh-board`), learning system (`@cotulenh/learn`), and web application (`cotulenh-app`). Currently the platform supports local play only — no user accounts, no online multiplayer, no persistent game data.

This PRD defines the MVP user and social layer: authentication, user profiles, friend system, match invitations, online gameplay, game history with PGN replay, and learn progress persistence. The goal is to transform CoTuLenh from a local tool into a living online platform — the definitive home for CoTuLenh players, modeled after the simplicity and speed of Lichess.

The backend uses **Supabase** (PostgreSQL + Realtime), selected via prior technical research for its official SvelteKit support (`@supabase/ssr`), relational data model fit for social features, and free-tier viability.

### What Makes This Special

CoTuLenh is the only game of its kind — a Vietnamese military strategy board game with no quality online platform. The one existing implementation (Board Game Arena) is buggy, slow, built on outdated technology, and effectively abandoned. An active offline community has no good alternative. This MVP fills that gap with modern technology, a responsive maintainer, and a foundation designed for future features (matchmaking, ELO ratings, tournaments) following Lichess-inspired patterns.

## Project Classification

- **Project Type:** Web App — online board game platform (Lichess-inspired)
- **Domain:** Online competitive strategy platform (turn-based)
- **Complexity:** Medium — auth, social features, game persistence; no regulatory or compliance concerns
- **Project Context:** Brownfield — adding user/social/backend layer to an existing local-play game with working engine, board UI, and learn system

## Success Criteria

### User Success

- A new player can sign up, add a friend, invite them to a match, and play a game within their first session
- Players return after their first game — the experience is smooth enough to come back
- Learn progress persists across sessions and devices — no lost progress when switching browsers
- The overall experience is noticeably better than BGA

### Business Success

- The community recognizes this as the right platform for CoTuLenh — a credible, modern alternative to BGA
- Players feel heard — feedback channels exist and are responsive
- The MVP proves the technology stack works and can be built upon for future features

### Technical Success

- Reliable operation — no dropped connections mid-game, no lost game state
- Lightweight client — works smoothly on mobile browsers with limited CPU, no heavy page reloads
- Supabase integration is clean and sustainable within free-tier constraints
- Existing game engine and board UI continue to work without regression

### Measurable Outcomes

- Account creation to first online game: under 5 minutes
- Page loads and move sync: sub-second on reasonable connections
- Mobile browser performance: smooth gameplay without frame drops or excessive memory usage
- Zero data loss: game history and learn progress reliably persisted

## User Journeys

### Journey 1: Minh — The BGA Veteran

**Who:** Minh, 28, has played CoTuLenh for 3 years on Board Game Arena. Frustrated by lag, clunky UI, and unfixed bugs. Active in Vietnamese board game Facebook groups.

**Opening Scene:** Minh sees a post in his Facebook group: "New CoTuLenh platform — built from scratch, looking for early players." He clicks, skeptical but hopeful.

**Rising Action:** The site loads fast — even on his phone. He signs up with email in under a minute. He searches for his regular opponent Huy, sends a friend request. Huy accepts. Minh sends a match invitation.

**Climax:** They play their first game. Moves sync instantly. No lag, no bugs. The deploy mechanic works correctly. The result appears in his game history. "This is what BGA should have been."

**Resolution:** Minh shares the link in two more groups, plays 4 games that week, submits UI feedback and sees it acknowledged. For the first time, the platform cares about CoTuLenh players.

**Requirements revealed:** Auth, friend search/add, match invitations, realtime gameplay, game history, feedback channel, mobile performance.

### Journey 2: Linh — The Curious Newcomer

**Who:** Linh, 22, university student who loves strategy games (chess, xiangqi). Discovers CoTuLenh through a web search.

**Opening Scene:** Linh lands on the site and sees the learn system. She starts a lesson without signing up.

**Rising Action:** She works through 3 lessons, learning piece movement and tactics. She's hooked. She signs up to save progress and try playing someone real — her learn progress carries over automatically.

**Climax:** She adds a friend from a Discord community and they play a match. She loses but replays the game move-by-move from her history to understand what went wrong.

**Resolution:** Linh has an account with saved learn progress, a friend, and a game in her history. She returns the next day.

**Requirements revealed:** Learn system without account, learn progress migration (localStorage → DB on signup), friend system, PGN game replay, anonymous-to-authenticated transition.

### Journey 3: Tuan — The Returning Learner

**Who:** Tuan, 35, tried CoTuLenh months ago. Completed several lessons on his laptop but had no one to play. Hears the platform now supports online play.

**Opening Scene:** Tuan returns on his phone. He signs up. His old laptop learn progress (localStorage) is gone from this device.

**Rising Action:** He re-does a couple of lessons on his phone. This time progress saves to his account. He switches to his laptop — everything is synced.

**Climax:** He shares an invite link with a curious coworker. The coworker signs up through the link and they play their first game together.

**Resolution:** Persistent progress across devices and a playing partner. The friction that stopped him before is gone.

**Requirements revealed:** Cross-device learn progress sync, invite link sharing for unregistered users, account-tied persistence.

### Journey 4: Phong — The Community Moderator

**Who:** Phong, 30, one of Noy's friends and an experienced CoTuLenh player. Volunteers to help keep the community healthy.

**Opening Scene:** Noy assigns Phong a moderator role via Supabase dashboard.

**Rising Action:** A player reports an opponent for a suspected illegal move. Phong reviews the dispute in the Supabase dashboard, checks the PGN, and replays the game locally to make a judgment. He also monitors feedback from Discord.

**Climax:** Phong resolves his first dispute fairly. The reporting player feels heard.

**Resolution:** The platform has a human layer of community trust. Players know disputes get reviewed.

**Requirements revealed:** Moderator role flag, dispute records in database, PGN storage for review. _Note: For MVP, moderation happens via Supabase dashboard and Discord — no custom in-app moderation UI._

### Journey 5: Noy — The Admin/Operator

**Who:** Noy, the developer and platform owner. Solo operator.

**Opening Scene:** Noy checks the platform after a week of soft launch.

**Rising Action:** He checks Supabase dashboard for user count, game count, and dispute records. He reviews feedback submissions and error logs.

**Climax:** 20 registered users, 45 games played, 3 feedback items. One is a quick bug fix. The platform is working.

**Resolution:** Noy ships a fix, replies to feedback, and plans the next feature based on player requests. The MVP is proving itself.

**Requirements revealed:** Supabase dashboard as primary admin tool (no custom admin UI for MVP), feedback review, role management.

### Journey Requirements Summary

| Capability                                     | Journeys          |
| ---------------------------------------------- | ----------------- |
| Auth (signup, signin, session)                 | All               |
| User profile & settings                        | Minh, Linh, Tuan  |
| Friend system (search, add, accept)            | Minh, Linh, Tuan  |
| Match invitations                              | Minh, Linh, Tuan  |
| Realtime online gameplay                       | Minh, Linh, Tuan  |
| Game history & PGN replay                      | Minh, Linh, Phong |
| Learn progress persistence (localStorage → DB) | Linh, Tuan        |
| Anonymous → authenticated transition           | Linh              |
| Invite link sharing                            | Tuan              |
| Move dispute system                            | Phong             |
| Feedback channel                               | Minh, Phong, Noy  |
| Admin via Supabase dashboard                   | Noy               |
| Mobile browser performance                     | Minh, Tuan        |

## Web App Specific Requirements

### Project-Type Overview

CoTuLenh is a SvelteKit web application operating as an SPA with SSR capabilities. The primary experience (gameplay, friends, history) runs client-side for responsiveness. Landing and public pages use SSR for SEO, following Lichess patterns.

### Browser Support

| Browser                    | Support Level                           |
| -------------------------- | --------------------------------------- |
| Chrome (desktop & mobile)  | Full support, primary target            |
| Firefox (desktop & mobile) | Full support                            |
| Safari (desktop & iOS)     | Full support, critical for iPhone users |
| Edge                       | Full support                            |
| Older/legacy browsers      | Not supported                           |

Mobile browser performance is a first-class concern.

### Responsive Design

- **Mobile-first approach** — board game UI must work well on phone screens
- **Breakpoints:** Phone (< 768px), Tablet (768-1024px), Desktop (> 1024px)
- **Touch-friendly controls** for piece movement, readable game info, accessible friend/invite flows
- **No native app for MVP** — web experience on mobile must stand on its own

### SEO Strategy

Following Lichess patterns:

- **SSR landing page** — discoverable by search engines
- **Game pages are SPA** — no individual game SEO needed
- **Open Graph meta tags** — link sharing previews in chat/social
- **Post-MVP:** SSR for public game archives and learn content if organic discovery matters

### Accessibility

- Basic keyboard navigation for non-board UI (menus, settings, forms)
- Semantic HTML and ARIA labels where practical
- Color contrast meeting WCAG AA for text and UI controls
- Board accessibility out of scope for MVP (inherently visual)
- Proper focus management for modals, dialogs, and navigation

### Technical Architecture

- **SvelteKit** (SSR + SPA hybrid), switching from `adapter-static` to `adapter-node`/`adapter-auto` for SSR auth
- **Supabase** for auth, database (PostgreSQL), and realtime (Broadcast + Presence)
- **`@supabase/ssr`** for SvelteKit integration (server-side auth, cookie-based sessions)
- **Existing packages unchanged** — `cotulenh-core` and `cotulenh-board` remain as-is; new code lives in `cotulenh-app` and potentially a new shared package for Supabase client/types
- **Realtime architecture:** Broadcast for game moves (ephemeral SAN messages, no DB write per move), Postgres for game state persistence (PGN saved on completion)
- **Trust-based client model:** Each client runs `@cotulenh/core` locally for move validation. Illegal SANs from opponent trigger dispute flow, not server-side rejection.

### Implementation Context

- **Auth:** Supabase Auth with email/password for MVP; social login post-MVP
- **Sessions:** Cookie-based via `@supabase/ssr` hooks
- **Database:** PostgreSQL tables for profiles, friendships, games, learn progress, disputes, feedback — using Row Level Security (RLS)
- **Realtime channels:** One Broadcast channel per active game, Presence for online status
- **Learn progress migration:** On signup, detect localStorage data (`persisted.svelte.ts`) and sync to Supabase; keep localStorage as local cache
- **App stack:** Svelte 5 runes (`$state`, `$effect`), bits-ui components, Tailwind 4, i18n (en/vi)
- **Core capabilities used:** `move()` accepts SAN strings, `pgn()`/`loadPgn()` for game serialization, `history()` for move replay, full game-ending detection (checkmate, stalemate, commander capture, draw conditions)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — deliver a complete, polished core loop (sign up → add friend → play a game → review history) that proves the platform works and feels better than BGA. Quality over quantity.

**Resource Reality:** Solo developer. Every feature must be justified. Manual processes (Discord for moderation, Supabase dashboard for admin) replace custom UI wherever possible.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- Minh (BGA veteran) — full journey
- Linh (curious newcomer) — full journey including anonymous-to-authenticated learn flow
- Tuan (returning learner) — full journey including invite link sharing

**Must-Have Capabilities:**

| Feature                                                    | Justification                       |
| ---------------------------------------------------------- | ----------------------------------- |
| Auth (email/password signup, signin, session)              | Foundation for everything           |
| User profile (display name, basic settings)                | Identity on the platform            |
| Friend system (search, send/accept requests, list)         | Required for match invitations      |
| Match invitations (invite friend, accept/decline)          | Core gameplay trigger               |
| Invite link sharing (shareable URL for unregistered users) | Growth mechanism, removes friction  |
| Online gameplay (realtime moves via Supabase Broadcast)    | The product's reason to exist       |
| Game history with PGN replay (move-by-move review)         | Retention, learning from past games |
| Learn progress persistence (localStorage → Supabase sync)  | Cross-device continuity             |
| Move dispute system (pause, report, admin review)          | Game integrity                      |
| In-app feedback button (with page context, browser info)   | Direct line to users, debugging aid |

**Explicitly NOT in MVP:**

- In-app moderation UI (use Discord + Supabase dashboard)
- Custom admin dashboard (use Supabase dashboard)
- Social login (email/password only)
- Chat/messaging between players
- Notifications (email or push)
- Automated server-side move verification

### Phase 2 — Growth

- ELO rating system
- Matchmaking (play against strangers)
- Leaderboards
- Spectating live games
- Social login (Google, GitHub)
- Basic notifications (email for game invites)
- Automated server-side PGN replay for dispute verification

### Phase 3 — Expansion

- Tournaments
- Puzzles and analysis boards
- In-app moderation tools
- Community features (forums, in-game chat)
- Dedicated mobile app
- Public API

### Risk Mitigation

**Technical Risks:**

- _Supabase Realtime reliability_ — Broadcast is ephemeral (no DB write per move), staying within free tier. PGN saved only on game completion.
- _Learn progress migration_ — localStorage remains as local cache; DB sync is additive. If sync fails, local data persists.
- _Client-side trust model_ — Illegal moves trigger dispute flow with PGN evidence. Admin reviews manually for MVP; automated verification in Phase 2.

**Market Risks:**

- _Community doesn't adopt_ — Soft-launch to known players from Discord/Facebook. Feedback button creates direct channel. Small community = fast iteration.
- _BGA players don't switch_ — Core experience (speed, reliability, UI quality) must be obviously better from the first game.

**Resource Risks:**

- _Solo dev bottleneck_ — Supabase managed services replace custom backend. Discord for moderation. Tight MVP scope.
- _Scope creep_ — The "Explicitly NOT in MVP" list is the boundary. No additions without removals.

## Functional Requirements

### User Identity & Authentication

- FR1: Visitors can create an account using email and password
- FR2: Registered users can sign in with their credentials
- FR3: Authenticated users can sign out from any page
- FR4: Users remain authenticated across page navigations and browser sessions (cookie-based)
- FR5: Users can reset their password via email
- FR6: Visitors can access the learn system, local play, and board editor without creating an account

### User Profile & Settings

- FR7: Users can set and update their display name
- FR8: Users can view their own profile summary (display name, games played, win/loss record, member since)
- FR9: Users can view another user's public profile and game history
- FR10: Users can update account settings (email, password)
- FR11: Existing app settings (sounds, move hints, theme, language) persist to the user's account when signed in

### Friend System

- FR12: Users can search for other users by display name
- FR13: Users can send a friend request to another user
- FR14: Users can view their pending incoming friend requests
- FR15: Users can accept or decline a friend request
- FR16: Users can view their friends list with online/offline status
- FR17: Users can remove a friend from their friends list

### Match Invitations & Game Setup

- FR18: Users can send a match invitation to an online friend
- FR19: Users can view their pending match invitations (sent and received)
- FR20: Users can accept or decline a match invitation
- FR21: Users can generate a shareable invite link for unregistered users
- FR22: Users who follow an invite link are guided through signup and into the pending match
- FR23: Users can cancel a sent match invitation before it is accepted
- FR24: Users can select time control settings when creating a match invitation

### Online Gameplay

- FR25: Two authenticated users can play a realtime game of CoTuLenh against each other
- FR26: When a player makes a move, the SAN is sent via Supabase Broadcast to the opponent's client
- FR27: Each client validates received moves locally using `@cotulenh/core`; valid moves update the board, turn, clock, and history
- FR28a: If a client receives an invalid/illegal SAN, the game is immediately paused and both players are notified of a move dispute
- FR28b: Both players can classify the incident as a bug or cheat report with optional comments
- FR28c: The dispute record (PGN, illegal move SAN, player reports) is saved to the database
- FR28d: The admin resolves disputes manually via Supabase dashboard (review PGN, replay locally, assign game result)
- FR29: The game enforces all CoTuLenh rules (including deploy sessions, stay captures, air defense) using the existing core engine
- FR30: Players can resign a game in progress
- FR31: The system detects game completion (checkmate, stalemate, commander captured, draw conditions) and records the result
- FR32: Chess clocks synchronize between players and enforce time controls
- FR33: Players can see current game status (whose turn, move count, clock time) during play
- FR34: On game completion, the full game is saved as PGN to the database (including headers, moves, result, clock data)

### Game History & Review

- FR35: Users can view a list of their past games with opponent, result, date, and duration
- FR36: Users can load and replay a completed game move-by-move using the stored PGN
- FR37: Users can navigate forward and backward through a completed game's moves

### Learn Progress Persistence

- FR38: Authenticated users' learn progress is saved to their account in the database
- FR39: Learn progress syncs across devices when users are signed in
- FR40: When a visitor with local learn progress signs up, their existing progress is migrated to their account
- FR41: The learn system continues to function for unauthenticated users using localStorage
- FR42: Star ratings, lesson completion status, and subject unlock state are all persisted

### Feedback & Support

- FR43: Users can submit feedback from any page via an in-app feedback button
- FR44: Feedback submissions automatically capture contextual information (current page URL, browser, device, screen size)
- FR45: Submitted feedback is stored and accessible to the admin

### Platform Infrastructure

- FR46: The application supports SSR for landing/public pages and SPA navigation for authenticated experiences
- FR47: All new user-facing features support English and Vietnamese (existing i18n system)
- FR48: The application works on modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge)

## Non-Functional Requirements

### Performance

- NFR1: Page initial load completes within 2 seconds on a 4G mobile connection
- NFR2: SPA route transitions complete within 300ms with no full page reload
- NFR3: Move broadcast latency (player action to opponent's board update) under 500ms on reasonable connections
- NFR4: The game board renders and remains interactive at 60fps on mid-range mobile devices
- NFR5: Client memory usage stays under 100MB during extended gameplay sessions (no leaks from realtime subscriptions or board re-renders)
- NFR6: The application loads and functions without blocking the main thread for more than 50ms (no UI jank)
- NFR7: Non-critical assets (learn system, game history) are lazy-loaded and do not impact initial page load

### Security

- NFR8: All data in transit is encrypted via HTTPS/WSS
- NFR9: User passwords are never stored in plaintext (handled by Supabase Auth with bcrypt)
- NFR10: Database access is controlled via Supabase Row Level Security — users can only read/write their own data and public profiles
- NFR11: Authentication tokens are stored in HTTP-only cookies, not localStorage (prevents XSS token theft)
- NFR12: User-generated content (display names, feedback text) is sanitized to prevent XSS
- NFR13: Game integrity is protected by client-side validation — illegal moves trigger dispute flow, not silent acceptance

### Reliability

- NFR14: Game state (PGN) is persisted to the database on completion — no game results are lost due to client disconnection
- NFR15: If a player's connection drops during a game, they can reconnect and resume from the last known state
- NFR16: Learn progress writes are idempotent — duplicate syncs do not corrupt data
- NFR17: The feedback system degrades gracefully — if submission fails, the user is notified and can retry
- NFR18: Supabase Realtime channel disconnections are detected and auto-reconnected with exponential backoff
