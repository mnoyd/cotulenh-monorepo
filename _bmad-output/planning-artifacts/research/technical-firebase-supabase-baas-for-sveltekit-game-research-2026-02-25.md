---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Firebase vs Supabase BaaS for SvelteKit strategy game - auth, realtime gameplay, user profiles, friend system'
research_goals: 'Evaluate Firebase and Supabase free tiers for adding auth, realtime game engine, user profiles, friend lists, and game invitations to the CoTuLenh SvelteKit monorepo. Future considerations: matchmaking and ELO ranking.'
user_name: 'Noy'
date: '2026-02-25'
web_research_enabled: true
source_verification: true
---

# BaaS Platform Selection for CoTuLenh Multiplayer: Firebase vs Supabase Technical Research

**Date:** 2026-02-25
**Author:** Noy
**Research Type:** Technical Platform Evaluation

---

## Executive Summary

This research evaluates Firebase and Supabase as Backend-as-a-Service platforms for adding multiplayer capabilities to CoTuLenh, a Vietnamese strategy board game built as a SvelteKit monorepo. The scope covers authentication, user profiles, friend systems, game invitations, and realtime gameplay — with future extensibility for matchmaking and ELO ranking.

**Supabase is the recommended platform.** It wins decisively across the dimensions that matter most for CoTuLenh:

- **Official SvelteKit support** (`@supabase/ssr`) vs Firebase's community-only patterns requiring manual SSR wiring
- **Relational data model** (PostgreSQL) naturally fits social features (friend lists, game history) and future needs (matchmaking via SQL range queries, leaderboards via `ORDER BY`)
- **Broadcast for game moves** — ephemeral WebSocket messages that don't consume DB bandwidth, keeping the free tier viable for heavy realtime usage
- **Row Level Security** — SQL-based policies are more expressive and testable than Firebase's JSON security rules
- **Cost trajectory** — 40-60% cheaper at scale with predictable per-resource pricing vs Firebase's per-operation model
- **Open source** — no vendor lock-in; self-hostable via Docker as an escape hatch

Firebase's advantages (built-in offline sync, slightly lower latency, larger free storage) are not decisive for a 2-player turn-based online game.

**Key Technical Findings:**

- Both platforms offer 50K MAU free auth — more than sufficient for MVP through growth
- Supabase Broadcast enables zero-DB-cost game moves (ephemeral messages)
- The existing CoTuLenh Core game engine stays pure — BaaS integration happens only in the SvelteKit app layer via a service abstraction
- Incremental adoption path: Auth → Social → Multiplayer → Competitive, each phase independently shippable
- Free tier risk (project pausing after 7 days inactivity) is mitigable via GitHub Actions cron ping

**Top Recommendations:**

1. Choose Supabase as the BaaS platform
2. Adopt incrementally — start with auth + profiles, layer in social and multiplayer
3. Use Broadcast (not DB writes) for game moves to maximize free tier value
4. Keep Core game engine pure — all BaaS integration in the SvelteKit app service layer
5. Test RLS policies with pgTAP from day one — security misconfigurations are the highest-severity risk

## Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis) — Platform comparison, SvelteKit integration, free tier limits, realtime suitability, cost projections
3. [Integration Patterns Analysis](#integration-patterns-analysis) — Auth flows, realtime game sync, friend system, security patterns
4. [Architectural Patterns and Design](#architectural-patterns-and-design) — System architecture, game room lifecycle, security layers, data schema, deployment
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption) — Adoption strategy, dev workflows, testing, CI/CD, cost optimization, risks
6. [Technical Research Recommendations](#technical-research-recommendations) — Platform verdict, implementation roadmap, skills, success metrics
7. [Research Synthesis and Conclusion](#research-synthesis-and-conclusion) — Key findings, future outlook, next steps

## Research Overview

This technical research was conducted over a single intensive session on 2026-02-25, evaluating Firebase and Supabase as BaaS platforms for the CoTuLenh SvelteKit monorepo. The research covered five analytical dimensions: technology stack comparison, integration patterns, architectural design, implementation approaches, and strategic recommendations. All claims were verified against current web sources (official documentation, community guides, pricing pages, and developer experience reports from 2025-2026). The full findings are organized in the sections below, with a final synthesis and conclusion at the end.

---

## Technical Research Scope Confirmation

**Research Topic:** Firebase vs Supabase BaaS for SvelteKit strategy game - auth, realtime gameplay, user profiles, friend system
**Research Goals:** Evaluate Firebase and Supabase free tiers for adding auth, realtime game engine, user profiles, friend lists, and game invitations to the CoTuLenh SvelteKit monorepo. Future considerations: matchmaking and ELO ranking.

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-25

## Technology Stack Analysis

### Platform Overview

| Aspect             | Firebase                                                      | Supabase                                            |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------- |
| **Founded**        | 2011 (acquired by Google 2014)                                | 2020                                                |
| **Database**       | NoSQL (Firestore + Realtime DB)                               | PostgreSQL (relational)                             |
| **Open Source**    | No (proprietary Google)                                       | Yes (self-hostable)                                 |
| **Querying**       | Basic filters, limited joins                                  | Full SQL, joins, transactions                       |
| **Auth**           | Mature, many SDKs, 50K MAU free                               | Built-in with Row Level Security, 50K MAU free      |
| **Realtime**       | Battle-tested, excellent offline support                      | WebSocket-based (Broadcast + Presence + DB Changes) |
| **Functions**      | Cloud Functions (Node.js, Python, Go)                         | Edge Functions (Deno/TypeScript)                    |
| **Vendor Lock-in** | High — proprietary data model, non-exportable password hashes | Low — standard PostgreSQL, self-hostable via Docker |

_Source: [Supabase vs Firebase](https://supabase.com/alternatives/supabase-vs-firebase), [Bytebase Comparison](https://www.bytebase.com/blog/supabase-vs-firebase/)_

### SvelteKit Integration

#### Firebase + SvelteKit

Firebase does not have official SvelteKit support, but the community has established patterns:

- **Client-side auth** via `onAuthStateChanged` with Svelte stores
- **SSR auth** via session cookies — token sent to server, server sets HTTP-only cookies
- **Key packages**: `firebase`, `firebase-admin` (server-side)
- **Complexity**: Moderate — requires manual SSR session management, no official SvelteKit adapter
- Several community boilerplates exist (CaptainCodeman/sveltekit-example, MIERUNE/sveltekit-firebase-auth-ssr)

_Source: [Captain Codeman - Firebase Auth with SvelteKit](https://www.captaincodeman.com/how-to-await-firebase-auth-with-sveltekit), [Client-Side Auth Guide](https://gundogmuseray.medium.com/easy-way-to-stop-worry-about-client-side-auth-with-firebase-and-sveltekit-d17cdcccb663)_

#### Supabase + SvelteKit

Supabase has **official first-class SvelteKit support**:

- **Official `@supabase/ssr` package** — cookie-based auth that works across entire SvelteKit stack (page, layout, server, hooks)
- **Official documentation** with SvelteKit-specific quickstart and tutorials
- **Key packages**: `@supabase/supabase-js`, `@supabase/ssr`
- **Complexity**: Low — official adapter handles SSR session management automatically

_Source: [Supabase SvelteKit SSR Auth Docs](https://supabase.com/docs/guides/auth/server-side/sveltekit), [SvelteKit Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/sveltekit)_

### Database & Storage Technologies

#### Firebase: Dual Database Architecture

**Firestore (Cloud Firestore)**

- Document/collection NoSQL model
- Complex queries with composite indexes
- 1 GB storage free, 50K reads/day, 20K writes/day free
- Better for structured data (user profiles, friend lists, game history)

**Realtime Database (RTDB)**

- JSON tree model, optimized for low-latency sync
- 1 GB storage, 10 GB/month download free
- Better for ephemeral game state (current board position, turn data)
- Priced by data transfer, not operations — more cost-effective for realtime listeners

**Recommended pattern for games**: Use both — RTDB for active game sessions, Firestore for everything else (profiles, friends, history).

_Source: [Firebase RTDB vs Firestore](https://firebase.google.com/docs/database/rtdb-vs-firestore), [Building Multiplayer with Firebase](https://paddo.dev/blog/flutter-real-time-multiplayer-firebase/)_

#### Supabase: Unified PostgreSQL

**PostgreSQL + Realtime Engine**

- Full relational database with SQL, joins, transactions
- 500 MB database, 1 GB storage, 5 GB bandwidth free
- Realtime via three mechanisms:
  - **Broadcast**: Low-latency ephemeral messages between clients (game moves)
  - **Presence**: Track online users, active game participants
  - **Postgres Changes**: Listen to DB changes via WebSocket (friend requests, invitations)
- Built on Elixir/Phoenix — high concurrency WebSocket server
- Row Level Security (RLS) for fine-grained access control

_Source: [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime), [Supabase Realtime Multiplayer](https://supabase.com/blog/supabase-realtime-multiplayer-general-availability)_

### Free Tier Comparison (Critical for CoTuLenh)

| Resource                 | Firebase (Spark)               | Supabase (Free)               |
| ------------------------ | ------------------------------ | ----------------------------- |
| **Auth MAU**             | 50,000                         | 50,000                        |
| **Database Storage**     | 1 GB (Firestore) + 1 GB (RTDB) | 500 MB (PostgreSQL)           |
| **File Storage**         | 1 GB                           | 1 GB                          |
| **Download/Bandwidth**   | 10 GB/month                    | 5 GB/month                    |
| **Realtime Connections** | 100 simultaneous (RTDB)        | 200 concurrent                |
| **Daily Read Ops**       | 50,000 (Firestore)             | Unlimited API requests        |
| **Daily Write Ops**      | 20,000 (Firestore)             | Unlimited API requests        |
| **Edge/Cloud Functions** | 125K invocations/month         | 500K invocations/month        |
| **Project Pausing**      | No                             | Yes — after 7 days inactivity |
| **Hosting**              | 1 GB stored, 10 GB transfer    | Not included                  |

**Key Difference**: Firebase charges per operation (reads/writes), Supabase charges per resource (storage/bandwidth). For a game with many realtime listeners, Firebase's per-operation model can burn through free tier faster.

**Critical Supabase Risk**: Free tier projects **pause after 7 days of inactivity**. Workarounds exist (GitHub Actions ping, external cron) but add complexity. Paused projects are restorable for 90 days.

**Critical Firebase Risk (Feb 2026)**: As of Feb 3, 2026, Spark plan projects with `*.appspot.com` default storage buckets lose console access and get 402/403 errors — must upgrade to Blaze (pay-as-you-go) to use Cloud Storage.

_Source: [Firebase Pricing](https://firebase.google.com/pricing), [Firebase Auth Limits](https://firebase.google.com/docs/auth/limits), [Supabase Pricing 2026](https://designrevision.com/blog/supabase-pricing), [Firebase Storage Changes](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)_

### Realtime Game Engine Suitability

#### For CoTuLenh (Turn-Based Strategy Game)

| Factor                      | Firebase RTDB                       | Supabase Realtime                 |
| --------------------------- | ----------------------------------- | --------------------------------- |
| **Latency**                 | ~50-100ms (excellent)               | ~100-200ms (good)                 |
| **Turn-based games**        | Excellent fit                       | Excellent fit                     |
| **2-player games**          | Perfect                             | Perfect                           |
| **Offline support**         | Built-in automatic sync             | Not built-in                      |
| **Conflict resolution**     | Last-write-wins or custom           | PostgreSQL transactions           |
| **Game state model**        | JSON tree — natural for board state | Relational rows or Broadcast JSON |
| **Presence (who's online)** | Via RTDB `.info/connected`          | Built-in Presence API             |

For a **2-player turn-based** game like CoTuLenh, both platforms are more than adequate. Latency differences are negligible for turn-based play.

_Source: [Firebase Multiplayer Game Guide](https://medium.com/@ktamura_74189/how-to-build-a-real-time-multiplayer-game-using-only-firebase-as-a-backend-b5bb805c6543), [Supabase Game Tutorial](https://www.aleksandra.codes/supabase-game)_

### Cost Projection for CoTuLenh

| Stage                 | Firebase Est.  | Supabase Est. |
| --------------------- | -------------- | ------------- |
| **MVP (<100 users)**  | $0             | $0            |
| **Early (<1K users)** | $0             | $0            |
| **Growing (1K-10K)**  | $50-200/month  | $25/month     |
| **Scale (10K-50K)**   | $200-600/month | $25-100/month |

Supabase is typically **40-60% cheaper at scale** due to predictable per-resource pricing vs Firebase's per-operation model.

_Source: [Cost Comparison](https://www.getmonetizely.com/articles/supabase-vs-firebase-which-baas-pricing-model-actually-saves-you-money-2cc4f), [Leanware Comparison](https://www.leanware.co/insights/supabase-vs-firebase-complete-comparison-guide)_

### Future Extensibility (Matchmaking & ELO)

| Feature                 | Firebase                                               | Supabase                                       |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| **ELO calculations**    | Cloud Functions (custom logic)                         | SQL functions or Edge Functions                |
| **Matchmaking queries** | Limited — NoSQL not ideal for range queries on ratings | Excellent — SQL `WHERE rating BETWEEN x AND y` |
| **Leaderboards**        | Requires denormalization or Cloud Functions            | Simple SQL `ORDER BY rating DESC LIMIT n`      |
| **Analytics**           | BigQuery integration (paid)                            | Direct SQL queries on PostgreSQL               |

Supabase's relational model is significantly better suited for matchmaking and ranking systems.

### Technology Adoption Trends

- **Supabase** is gaining rapid adoption, especially in the SvelteKit ecosystem (official support, growing community)
- **Firebase** remains the dominant BaaS with a massive ecosystem but is seen as increasingly expensive at scale
- Industry trend is moving toward open-source, self-hostable solutions to avoid vendor lock-in
- PostgreSQL adoption continues to grow as the default database choice for new projects

_Source: [Free Tiers Infographic](https://www.freetiers.com/blog/firebase-vs-supabase-comparison), [Hackceleration Supabase Review 2026](https://hackceleration.com/supabase-review/)_

## Integration Patterns Analysis

### Authentication Flow Patterns

#### Supabase + SvelteKit Auth (Official SSR Pattern)

```
Client                    SvelteKit Server              Supabase Auth
  |                            |                              |
  |-- Login (email/OAuth) ---->|                              |
  |                            |-- createServerClient() ----->|
  |                            |<-- Session cookie ----------|
  |<-- Set-Cookie (httpOnly) --|                              |
  |                            |                              |
  |-- Page request + cookie -->|                              |
  |                            |-- hooks.server.ts            |
  |                            |   getSession() validates JWT |
  |                            |   getUser() verifies server  |
  |                            |<-- Validated user ---------- |
  |<-- SSR page with user -----|                              |
```

**Key integration points:**

- `hooks.server.ts`: Creates Supabase server client on every request, reads session from cookies
- `+layout.server.ts`: Passes session to client via `event.locals.getSession()`
- `+layout.ts`: Creates browser client, syncs server session to client
- **Protected routes**: `+page.server.ts` in auth-required layouts to enforce server-side checks even during client navigation
- **Best practice**: Use `auth.getUser()` (server-verified) over `auth.getSession()` (local JWT only) for security-critical operations

_Source: [Supabase SvelteKit SSR Docs](https://supabase.com/docs/guides/auth/server-side/sveltekit), [SSR Auth Pattern](https://dev.to/kvetoslavnovak/supabase-ssr-auth-48j4)_

#### Firebase + SvelteKit Auth (Community Pattern)

```
Client                    SvelteKit Server              Firebase Auth
  |                            |                              |
  |-- Firebase SDK login ----->|                              |
  |<-- ID token ---------------|--------- (client-side) ---->|
  |-- POST /api/session ------>|                              |
  |                            |-- firebase-admin             |
  |                            |   verifyIdToken()            |
  |                            |   createSessionCookie()      |
  |<-- Set-Cookie (session) ---|                              |
  |                            |                              |
  |-- Page request + cookie -->|                              |
  |                            |-- hooks.server.ts            |
  |                            |   verifySessionCookie()      |
  |<-- SSR page with user -----|                              |
```

**Key integration points:**

- Auth happens **client-side first** via Firebase JS SDK, then token is sent to server
- Server creates session cookie via `firebase-admin` SDK
- `hooks.server.ts`: Verifies session cookie on every request
- Requires **two Firebase packages**: `firebase` (client) + `firebase-admin` (server)
- No official SvelteKit adapter — must wire up manually
- `OnDisconnect` feature useful for game cleanup when player disconnects

_Source: [MIERUNE/sveltekit-firebase-auth-ssr](https://github.com/MIERUNE/sveltekit-firebase-auth-ssr), [Firebase SSR Pattern](https://dev.to/mpiorowski/svelte-firebase-ssr-3p3j)_

### Realtime Game State Sync Patterns

#### Supabase Realtime for CoTuLenh Game Play

```
Player A                  Supabase Realtime              Player B
  |                       (Elixir/Phoenix)                    |
  |-- Subscribe channel -------->|<-------- Subscribe channel-|
  |                              |                            |
  |-- Broadcast: move ---------> |                            |
  |                              |--- Broadcast: move ------->|
  |                              |                            |
  |                              |<-- Broadcast: move --------|
  |<-- Broadcast: move ---------|                            |
  |                              |                            |
  |-- Presence: sync ---------->|                            |
  |<-- presence_state ----------|--- presence_diff ---------->|
```

**Three realtime mechanisms available:**

1. **Broadcast** (ephemeral, low-latency): Best for game moves — client-to-client via server, no DB persistence needed per move
2. **Presence** (in-memory CRDT): Track who's online, who's in a game, typing indicators
3. **Postgres Changes** (persistent): Listen for DB changes — new friend requests, game invitations, status updates

**Game integration pattern:**

- Game room = Realtime Channel (public or private with RLS)
- Each move sent as Broadcast event with game state payload
- Game result persisted to PostgreSQL at end of game
- Presence tracks active players in game lobby

_Source: [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture), [Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast), [Realtime Protocol](https://supabase.com/docs/guides/realtime/protocol)_

#### Firebase RTDB for CoTuLenh Game Play

```
Player A                  Firebase RTDB                  Player B
  |                       (JSON tree)                         |
  |-- ref.onValue() listener -->|<------- ref.onValue() ------|
  |                              |                            |
  |-- ref.update({move}) ------>|                            |
  |                              |--- onValue fires --------->|
  |                              |                            |
  |                              |<-- ref.update({move}) -----|
  |<-- onValue fires ----------|                            |
  |                              |                            |
  |-- onDisconnect.set() ------>|  (cleanup on disconnect)   |
```

**Data structure pattern:**

```json
{
  "games": {
    "gameId123": {
      "players": { "uid1": true, "uid2": true },
      "state": { "fen": "...", "turn": "red", "moveHistory": [...] },
      "status": "active"
    }
  }
}
```

**Key features:**

- `onValue` / `onChildChanged`: Real-time listeners fire on any state change
- `OnDisconnect`: Automatic cleanup when player drops (mark as forfeit, pause game)
- Security rules enforce turn order: only current player can write to `state`
- JSON tree maps naturally to game state

_Source: [Firebase RTDB Docs](https://firebase.google.com/docs/database), [Firebase Quickdraw Multiplayer](https://firebase.blog/posts/2022/06/firebase-quickdraw/), [RTDB Security Rules](https://firebase.google.com/docs/database/security)_

### Friend System & Invitation Patterns

#### Supabase: Relational Friend System

```sql
-- Tables
profiles (id, username, display_name, avatar_url, created_at)
friendships (id, user_id, friend_id, status, created_at)
  -- status: 'pending', 'accepted', 'blocked'
game_invitations (id, from_user, to_user, game_type, status, created_at)
  -- status: 'pending', 'accepted', 'declined', 'expired'

-- RLS Policy: Users see only their own friendships
CREATE POLICY "Users see own friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- RLS Policy: Users can only send friend requests as themselves
CREATE POLICY "Users send own requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Integration with Realtime:**

- Friend request sent → INSERT into `friendships` → Postgres Changes fires → recipient gets real-time notification
- Game invitation → INSERT into `game_invitations` → Postgres Changes fires → friend gets invite popup
- No Cloud Functions needed for basic flows — RLS + Realtime handles it

_Source: [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security), [RLS Guide 2026](https://designrevision.com/blog/supabase-row-level-security)_

#### Firebase: NoSQL Friend System

```
/users/{uid}/
  profile: { username, displayName, avatarUrl }
  friends: { friendUid1: true, friendUid2: true }
  pendingRequests: { fromUid: { timestamp, status } }
  sentRequests: { toUid: { timestamp, status } }

/gameInvitations/{inviteId}/
  from: uid
  to: uid
  gameType: "cotulenh"
  status: "pending"
```

**Integration:**

- Friend request: Write to both sender's `sentRequests` and recipient's `pendingRequests` (requires transaction or Cloud Function)
- Accept: Move entries to `friends` subcollections, clean up pending (Cloud Function recommended for atomicity)
- Game invite: Write to `gameInvitations`, recipient listens with `onSnapshot`
- **More complex** — denormalized data requires keeping multiple locations in sync

_Source: [Firebase Friend Request Pattern](https://github.com/kirankunigiri/Firebase-Friend-Request), [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model), [Firestore Presence](https://firebase.google.com/docs/firestore/solutions/presence)_

### Security Patterns Comparison

| Pattern                    | Supabase                               | Firebase                             |
| -------------------------- | -------------------------------------- | ------------------------------------ |
| **Auth tokens**            | JWT (auto-managed via `@supabase/ssr`) | JWT + session cookies (manual setup) |
| **Data access control**    | Row Level Security (SQL policies)      | Security Rules (JSON-like DSL)       |
| **Friend data isolation**  | RLS: `auth.uid() = user_id`            | Rules: `auth.uid === $uid`           |
| **Game state protection**  | RLS + Broadcast channel auth           | Security Rules on RTDB paths         |
| **API security**           | PostgREST auto-applies RLS             | SDK enforces rules client-side       |
| **Server-side validation** | Edge Functions + RLS                   | Cloud Functions + Admin SDK          |

**Confidence level**: High — based on official documentation from both platforms.

### Integration Complexity Summary

| Integration Area           | Supabase                    | Firebase                               |
| -------------------------- | --------------------------- | -------------------------------------- |
| **Auth + SvelteKit SSR**   | Low (official adapter)      | Medium (manual session cookies)        |
| **Realtime game sync**     | Low (Broadcast API)         | Low (RTDB listeners)                   |
| **Friend system**          | Low (SQL + RLS)             | Medium (denormalized, needs functions) |
| **Game invitations**       | Low (Postgres Changes)      | Medium (Firestore listeners + rules)   |
| **Presence/online status** | Low (built-in Presence API) | Low (RTDB `.info/connected`)           |
| **Overall**                | **Low**                     | **Medium**                             |

## Architectural Patterns and Design

### System Architecture: CoTuLenh with BaaS

The CoTuLenh monorepo already has a clean layered architecture:

```
apps/cotulenh/          ← SvelteKit app (Controller/View)
packages/cotulenh/
  core/                 ← Game engine (Model - pure logic)
  board/                ← Board UI component (View)
  common/               ← Shared types/utilities
  combine-piece/        ← Piece combination logic
  learn/                ← Tutorial/learning module
```

**Proposed BaaS integration layer:**

```
apps/cotulenh/
  src/
    lib/
      server/           ← Server-only BaaS client, hooks
        supabase.ts     ← createServerClient()
        auth.ts         ← Session validation helpers
      client/           ← Browser BaaS client
        supabase.ts     ← createBrowserClient()
      services/         ← Domain service layer (NEW)
        auth.service.ts       ← Login, logout, session
        profile.service.ts    ← User profile CRUD
        friends.service.ts    ← Friend requests, list
        game-room.service.ts  ← Game creation, invites, realtime
        presence.service.ts   ← Online status tracking
    hooks.server.ts     ← Auth middleware (session from cookies)
    routes/
      (auth)/           ← Protected route group
        play/           ← Game lobby, active games
        profile/        ← User settings
        friends/        ← Friend management
      (public)/         ← Public routes (login, register)
```

**Key architectural decision**: The game **Core** package remains pure — no BaaS dependency. The service layer in the SvelteKit app bridges Core game logic with BaaS persistence and realtime.

_Source: [SvelteKit Monorepo Excellence](https://oestechnology.co.uk/posts/sveltekit-monorepo-excellence), [BFF Pattern with SvelteKit + Supabase](https://dev.to/soom/introducing-the-bff-backend-for-frontend-concept-by-simple-application-with-sveltekit-supabase-and-graphql-code-generator-2nmc)_

### Design Principles for BaaS Integration

**1. Separation of Concerns — Core stays pure**
The existing `cotulenh-core` package handles game rules, move validation, and state management with zero external dependencies. This must be preserved. BaaS integration happens only in the app layer.

**2. BFF (Backend for Frontend) Pattern**
SvelteKit acts as the BFF layer — server-side routes (`+page.server.ts`, `+server.ts`) interact with BaaS, apply business logic, and return shaped data to the client. This prevents direct client-to-BaaS calls for sensitive operations.

**3. Service Layer Abstraction**
Domain services (auth, friends, game-room) abstract BaaS SDK calls. If migrating from Supabase to another provider later, only the service layer changes — routes and components remain unchanged.

**4. Command Pattern for Game Moves**
Game moves already flow through the Core's `makeCoreMove()` → `MoveResult` pattern. For multiplayer, this extends naturally:

- Player makes move → Core validates locally → Broadcast to opponent → Opponent's Core validates → UI updates
- Server-side validation via Edge Function for anti-cheat (optional, can add later)

_Source: [Turn-Based Game Architecture](https://outscal.com/blog/turn-based-game-architecture), [Serverless Game Architecture](https://benhofferber.com/code/serverless-game-architecture/)_

### Scalability and Performance Patterns

**Turn-based game scaling considerations:**

| Concern                 | Pattern                            | Notes                                              |
| ----------------------- | ---------------------------------- | -------------------------------------------------- |
| **Concurrent games**    | Each game = 1 Realtime channel     | Supabase free tier: 200 concurrent connections     |
| **Game state size**     | Broadcast payload ~1-5 KB per move | CoTuLenh board state is small — well within limits |
| **Move validation**     | Client-side via Core (primary)     | Server-side Edge Function (optional anti-cheat)    |
| **Game history**        | Persist to PostgreSQL at game end  | Not every move — reduces DB writes                 |
| **User presence**       | Supabase Presence (in-memory CRDT) | Minimal DB load                                    |
| **Friend list queries** | PostgreSQL with indexes            | RLS auto-filters, index on `user_id`/`friend_id`   |

**Scaling path:**

1. **MVP**: Supabase free tier handles ~100 concurrent games easily
2. **Growth**: Pro tier ($25/mo) handles thousands of concurrent connections
3. **Scale**: Self-host Supabase on own infrastructure if needed (open source)

_Source: [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture), [Serverless Multiplayer](https://aws.amazon.com/blogs/compute/building-a-serverless-multiplayer-game-that-scales/)_

### Game Room Architecture

```
┌─────────────────────────────────────────────────┐
│                  GAME LIFECYCLE                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  1. CREATE GAME                                   │
│     Player A creates game → INSERT games table    │
│     Status: 'waiting'                             │
│                                                   │
│  2. INVITE / MATCHMAKE                            │
│     INSERT game_invitations → Postgres Changes    │
│     fires → Player B sees invite notification     │
│                                                   │
│  3. ACCEPT & JOIN                                 │
│     Player B accepts → UPDATE game status='active'│
│     Both players subscribe to game channel        │
│     Presence tracks both players online           │
│                                                   │
│  4. GAMEPLAY                                      │
│     Moves sent via Broadcast (ephemeral)          │
│     Each move: { type, from, to, fen, turn }      │
│     Core validates on both clients                │
│                                                   │
│  5. GAME END                                      │
│     Result persisted to games table               │
│     ELO updated (future)                          │
│     Channel unsubscribed                          │
│                                                   │
│  6. DISCONNECT HANDLING                           │
│     Presence detects disconnect                   │
│     Grace period → auto-forfeit or pause          │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Key design decision — Broadcast vs DB writes for moves:**

- **Broadcast** (recommended): Moves are ephemeral messages, not persisted per-move. Only game result is saved. This minimizes DB usage and stays well within free tier.
- **DB writes per move** (alternative): Every move written to `game_moves` table. More durable but uses more DB storage and bandwidth. Consider for ranked/competitive play where move history matters.

_Source: [Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [Realtime Multiplayer GA](https://supabase.com/blog/supabase-realtime-multiplayer-general-availability)_

### Security Architecture

```
┌─────────────────────────────────────────────┐
│              SECURITY LAYERS                 │
├─────────────────────────────────────────────┤
│                                               │
│  Layer 1: AUTH (Supabase Auth)                │
│  ├─ JWT tokens managed via @supabase/ssr      │
│  ├─ Session cookies (httpOnly, secure)        │
│  └─ hooks.server.ts validates on every req    │
│                                               │
│  Layer 2: DATA ACCESS (Row Level Security)    │
│  ├─ profiles: users read own + friends'       │
│  ├─ friendships: users see own relationships  │
│  ├─ games: participants only                  │
│  └─ game_invitations: sender + recipient      │
│                                               │
│  Layer 3: REALTIME (Channel Authorization)    │
│  ├─ Private channels for game rooms           │
│  ├─ Only game participants can join channel    │
│  └─ Broadcast messages scoped to channel      │
│                                               │
│  Layer 4: GAME LOGIC (Core validation)        │
│  ├─ Core validates moves client-side          │
│  ├─ Both clients validate independently       │
│  └─ Edge Function validation (future)         │
│                                               │
└─────────────────────────────────────────────┘
```

**Trust model**: For a casual game between friends, client-side Core validation (both clients validate independently) is sufficient. Server-side validation via Edge Functions can be added later for ranked/competitive play.

_Source: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Edge Functions Auth](https://supabase.com/docs/guides/functions/auth), [Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)_

### Data Architecture

**Proposed PostgreSQL schema (Supabase):**

```
profiles
├─ id (uuid, FK → auth.users)
├─ username (unique)
├─ display_name
├─ avatar_url
├─ elo_rating (integer, default 1200, future)
├─ created_at, updated_at

friendships
├─ id (uuid)
├─ user_id (uuid, FK → profiles)
├─ friend_id (uuid, FK → profiles)
├─ status ('pending' | 'accepted' | 'blocked')
├─ created_at
├─ UNIQUE(user_id, friend_id)

games
├─ id (uuid)
├─ red_player_id (uuid, FK → profiles)
├─ black_player_id (uuid, FK → profiles)
├─ status ('waiting' | 'active' | 'completed' | 'abandoned')
├─ result ('red_win' | 'black_win' | 'draw' | null)
├─ initial_fen (text, for custom setups)
├─ final_fen (text)
├─ move_count (integer)
├─ started_at, completed_at, created_at

game_invitations
├─ id (uuid)
├─ from_user_id (uuid, FK → profiles)
├─ to_user_id (uuid, FK → profiles)
├─ game_id (uuid, FK → games, nullable)
├─ status ('pending' | 'accepted' | 'declined' | 'expired')
├─ created_at, expires_at
```

This relational model naturally supports:

- Friend queries with SQL joins
- Game history and statistics
- Future ELO calculations via SQL functions
- Leaderboards via simple `ORDER BY elo_rating DESC`

_Source: [Supabase User Management Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-sveltekit), [PostgreSQL Data Architecture](https://supabase.com/docs/guides/database/postgres/row-level-security)_

### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│              DEPLOYMENT STACK                 │
├─────────────────────────────────────────────┤
│                                               │
│  SvelteKit App                                │
│  ├─ Vercel / Netlify / Cloudflare Pages       │
│  ├─ SSR with adapter-auto or adapter-vercel   │
│  └─ Static assets via CDN                     │
│                                               │
│  Supabase (Managed)                           │
│  ├─ PostgreSQL database                       │
│  ├─ Auth service                              │
│  ├─ Realtime server (WebSockets)              │
│  ├─ Edge Functions (Deno)                     │
│  └─ Storage (avatars, assets)                 │
│                                               │
│  No additional infrastructure needed          │
│  Total cost at MVP: $0                        │
│                                               │
└─────────────────────────────────────────────┘
```

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategy for CoTuLenh

**Recommended approach: Incremental adoption with Supabase**

Given the research findings across all prior steps, Supabase is the recommended platform. The adoption should be incremental, layering capabilities one at a time:

```
Phase 1: Auth Foundation
├─ Supabase project setup (free tier)
├─ @supabase/ssr integration with SvelteKit hooks
├─ Email/password + Google OAuth
├─ Protected route groups
├─ User profile table + RLS
└─ Local dev with Supabase CLI + Docker

Phase 2: Social Layer
├─ Friendships table + RLS policies
├─ Friend request/accept/block flows
├─ Postgres Changes → real-time friend notifications
├─ Online presence via Supabase Presence
└─ Friend list UI

Phase 3: Multiplayer
├─ Games + game_invitations tables
├─ Game room lifecycle (create → invite → accept → play → end)
├─ Broadcast channels for game moves
├─ Core game engine integration (validate locally, broadcast to opponent)
├─ Disconnect handling via Presence
└─ Game history persistence

Phase 4: Polish & Future (later epic)
├─ ELO rating system (SQL functions)
├─ Matchmaking (SQL range queries)
├─ Leaderboards
├─ Edge Function move validation (anti-cheat)
└─ Spectator mode
```

**Why incremental**: Each phase is independently shippable and testable. Auth works without friends, friends work without multiplayer. If you hit a blocker at any phase, prior work still has value.

_Source: [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices)_

### Development Workflows and Tooling

#### Local Development Setup

```
# One-time setup
supabase init                           # Creates supabase/ directory
supabase start                          # Starts local PostgreSQL, Auth, Realtime, Studio

# Environment config
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>

# Development loop
supabase db reset                       # Apply all migrations fresh
supabase gen types typescript --local   # Generate TypeScript types
pnpm dev                               # Start SvelteKit dev server
```

**Local Supabase Dashboard**: `http://localhost:54323` — full Studio UI for browsing tables, testing RLS, and managing auth users locally.

#### Monorepo Integration

The `supabase/` directory should be a workspace member in the pnpm monorepo:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/cotulenh/*'
  - 'supabase' # NEW: Supabase as workspace
```

```json
// supabase/package.json
{
  "name": "@cotulenh/supabase",
  "scripts": {
    "start": "supabase start",
    "stop": "supabase stop",
    "reset": "supabase db reset",
    "types": "supabase gen types typescript --local > ../apps/cotulenh/app/src/lib/database.types.ts",
    "migrate": "supabase migration new",
    "test": "supabase test db"
  }
}
```

**Type sharing**: Generated `database.types.ts` lives in the SvelteKit app's `$lib` and provides full type safety for all Supabase queries.

_Source: [Perfect Local SvelteKit Supabase Setup 2025](https://dev.to/jdgamble555/perfect-local-sveltekit-supabase-setup-in-2025-4adp), [Supabase Turborepo Setup](https://philipp.steinroetter.com/posts/supabase-turborepo), [Supabase CLI Docs](https://supabase.com/docs/guides/local-development/cli/getting-started)_

### Testing and Quality Assurance

#### Testing Strategy (3 layers)

| Layer            | Tool                         | What to Test                                                  |
| ---------------- | ---------------------------- | ------------------------------------------------------------- |
| **Database/RLS** | pgTAP via `supabase test db` | RLS policies enforce correct access, migrations apply cleanly |
| **Integration**  | Vitest + Supabase client     | Auth flows, friend request logic, game invitation flows       |
| **E2E**          | Playwright                   | Login → add friend → invite → play game → result saved        |

#### RLS Policy Testing (Critical)

```sql
-- Example pgTAP test: users can only see their own friendships
BEGIN;
SELECT plan(2);

-- Authenticate as user_a
SELECT set_config('request.jwt.claims', '{"sub": "user-a-uuid"}', true);

-- user_a can see their friendship
SELECT ok(
  EXISTS(SELECT 1 FROM friendships WHERE user_id = 'user-a-uuid'),
  'User can see own friendships'
);

-- user_a cannot see user_c's friendships
SELECT ok(
  NOT EXISTS(SELECT 1 FROM friendships WHERE user_id = 'user-c-uuid'),
  'User cannot see other users friendships'
);

SELECT * FROM finish();
ROLLBACK;
```

#### Integration Testing with Vitest

```typescript
// Test auth flow against local Supabase
import { createClient } from '@supabase/supabase-js';

describe('Auth', () => {
  const supabase = createClient(LOCAL_URL, ANON_KEY);

  it('should sign up and create profile', async () => {
    const { data } = await supabase.auth.signUp({ email, password });
    expect(data.user).toBeDefined();
    // Profile auto-created via trigger
    const { data: profile } = await supabase
      .from('profiles')
      .select()
      .eq('id', data.user.id)
      .single();
    expect(profile.username).toBeDefined();
  });
});
```

_Source: [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview), [RLS Testing](https://dev.to/davepar/testing-supabase-row-level-security-4h32), [pgTAP Guide](https://usebasejump.com/blog/testing-on-supabase-with-pgtap), [Edge Functions Testing](https://supabase.com/docs/guides/functions/unit-test)_

### Deployment and CI/CD

#### Migration Workflow

```
Developer                    GitHub                     Supabase
  |                            |                           |
  |-- supabase migration new ->|                           |
  |-- Write SQL migration      |                           |
  |-- Test locally (db reset)  |                           |
  |-- git push ─────────────-->|                           |
  |                            |-- CI: lint + test ------->|
  |                            |-- PR merged to main       |
  |                            |-- CD: supabase db push -->|
  |                            |                           |-- Apply migration
```

**Key practices:**

- Migrations are SQL files in `supabase/migrations/` — version controlled with the codebase
- `supabase db push` deploys migrations to production
- Never make schema changes via Studio in production — always via migrations
- Use staging project for pre-production validation

#### CI/CD Pipeline (GitHub Actions)

```yaml
# Simplified workflow
jobs:
  test:
    steps:
      - supabase start # Local Supabase for tests
      - supabase db reset # Apply all migrations
      - supabase test db # Run pgTAP tests
      - pnpm test # Run Vitest + Playwright
  deploy:
    needs: test
    steps:
      - supabase link --project-ref $PROD_REF
      - supabase db push # Deploy migrations
      # SvelteKit deployed via Vercel/Netlify auto-deploy
```

_Source: [Supabase Migrations Docs](https://supabase.com/docs/guides/deployment/database-migrations), [Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments), [Supabase DevOps](https://www.hrekov.com/blog/supabase-devops-version-control)_

### Cost Optimization and Resource Management

#### Free Tier Optimization Strategies

| Resource                     | Limit                                                                                          | Optimization                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Database (500 MB)**        | Store only essential data — profiles, friendships, game results. No move-by-move storage.      | Estimated usage: <10 MB for first 1K users |
| **Bandwidth (5 GB)**         | Use Broadcast for game moves (doesn't count as DB bandwidth). Minimize file storage downloads. | Game moves = 0 bandwidth cost              |
| **Connections (200)**        | Each game = 1 channel, 2 connections. Max ~100 concurrent games.                               | Sufficient for MVP                         |
| **Auth (50K MAU)**           | More than enough for MVP-Growth stage                                                          | No optimization needed                     |
| **Edge Functions (500K/mo)** | Not needed initially — add for anti-cheat later                                                | $0 until Phase 4                           |

**Broadcast is the key free-tier enabler**: Game moves via Broadcast are ephemeral WebSocket messages — they don't write to the database and don't consume DB bandwidth. This means the game can handle heavy realtime traffic while barely touching free tier limits.

#### When to Upgrade

| Signal                          | Action                                           |
| ------------------------------- | ------------------------------------------------ |
| Database > 400 MB               | Upgrade to Pro ($25/mo) or archive old game data |
| Bandwidth > 4 GB/month          | Optimize asset delivery via external CDN         |
| Need daily backups              | Upgrade to Pro                                   |
| Production reliability required | Upgrade to Pro (no pausing, email support)       |

_Source: [Making the Most of Supabase Free Tier](https://medium.com/@reliabledataengineering/making-the-most-of-supabases-free-tier-a-practical-guide-ef4817d84a26), [Supabase Pricing Breakdown](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)_

### Risk Assessment and Mitigation

| Risk                               | Severity | Mitigation                                                                                       |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| **Free tier project pausing**      | High     | GitHub Actions cron ping every 3 days; upgrade to Pro when users depend on it                    |
| **RLS policy misconfiguration**    | High     | pgTAP tests for every policy; review in PR process                                               |
| **Supabase outage**                | Medium   | Supabase has 99.9% SLA on Pro; game state is ephemeral so reconnect handles most cases           |
| **Vendor dependency**              | Low      | Supabase is open source — can self-host if needed; service layer abstraction limits blast radius |
| **Database migration errors**      | Medium   | Test migrations locally via `db reset`; staging project before production                        |
| **WebSocket connection limits**    | Low      | 200 concurrent connections = ~100 games; Pro tier removes this limit                             |
| **Data loss (no backups on free)** | Medium   | Export critical data periodically; upgrade to Pro for daily backups when needed                  |

_Source: [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [Supabase Review 2026](https://hackceleration.com/supabase-review/)_

## Technical Research Recommendations

### Platform Recommendation: Supabase

**Verdict: Supabase is the clear winner for CoTuLenh** based on:

1. **Official SvelteKit support** — vs Firebase's community-only patterns
2. **Relational model** — natural fit for social features (friends, matchmaking, ELO)
3. **Broadcast for game moves** — ephemeral, low-latency, doesn't consume DB resources
4. **RLS for security** — SQL policies are more expressive than Firebase security rules
5. **Cost trajectory** — 40-60% cheaper at scale, predictable pricing
6. **Open source** — no vendor lock-in, self-hostable escape hatch
7. **Future-proof** — SQL queries for matchmaking/leaderboards are trivial vs NoSQL workarounds

**Firebase is better if**: you need offline-first play (Firebase RTDB has built-in offline sync), or you're already deeply invested in the Google ecosystem.

### Implementation Roadmap

| Phase              | Scope                                                         | Estimated Effort | Dependencies    |
| ------------------ | ------------------------------------------------------------- | ---------------- | --------------- |
| **1. Auth**        | Supabase setup, SSR auth, profiles, protected routes          | 1 epic           | None            |
| **2. Social**      | Friendships, friend requests, presence, notifications         | 1 epic           | Phase 1         |
| **3. Multiplayer** | Game rooms, Broadcast moves, game lifecycle, Core integration | 1 epic           | Phase 1 + 2     |
| **4. Competitive** | ELO, matchmaking, leaderboards, server validation             | 1 epic (future)  | Phase 1 + 2 + 3 |

### Skill Development Requirements

| Skill                 | Current Level (est.) | Needed       | Resources                             |
| --------------------- | -------------------- | ------------ | ------------------------------------- |
| **SvelteKit SSR**     | Intermediate         | Intermediate | Existing knowledge sufficient         |
| **Supabase Auth/RLS** | New                  | Intermediate | Official docs + tutorials (excellent) |
| **PostgreSQL**        | Basic-Intermediate   | Intermediate | RLS policies, triggers, functions     |
| **Supabase Realtime** | New                  | Intermediate | Broadcast + Presence docs             |
| **Supabase CLI**      | New                  | Basic        | Local dev setup guide                 |

### Success Metrics

| Metric                   | Target                                          |
| ------------------------ | ----------------------------------------------- |
| **Auth completion**      | User can sign up, log in, update profile        |
| **Friend system**        | Add/accept/block friends, see online status     |
| **Game invitation**      | Invite friend, friend accepts, both enter game  |
| **Multiplayer game**     | Complete a full CoTuLenh game via Broadcast     |
| **Free tier compliance** | All features work within Supabase free tier     |
| **Test coverage**        | RLS policies 100% tested, auth flows E2E tested |

## Research Synthesis and Conclusion

### Summary of Key Technical Findings

| Dimension                          | Firebase                                | Supabase                           | Winner   |
| ---------------------------------- | --------------------------------------- | ---------------------------------- | -------- |
| **SvelteKit Integration**          | Community patterns, manual SSR          | Official `@supabase/ssr`           | Supabase |
| **Data Model for Social Features** | NoSQL — denormalized, complex sync      | SQL — joins, transactions, RLS     | Supabase |
| **Realtime for Turn-Based Games**  | RTDB listeners, excellent               | Broadcast + Presence, excellent    | Tie      |
| **Free Tier Auth**                 | 50K MAU                                 | 50K MAU                            | Tie      |
| **Free Tier Storage**              | 2 GB (Firestore + RTDB)                 | 500 MB                             | Firebase |
| **Free Tier Bandwidth**            | 10 GB/month                             | 5 GB/month                         | Firebase |
| **Game Move Cost**                 | Read/write ops per listener             | Broadcast = $0 DB cost             | Supabase |
| **Friend System Complexity**       | Medium (denormalized + Cloud Functions) | Low (SQL + RLS + Postgres Changes) | Supabase |
| **Future Matchmaking/ELO**         | Awkward with NoSQL                      | Natural with SQL                   | Supabase |
| **Vendor Lock-in**                 | High (proprietary)                      | Low (open source, self-hostable)   | Supabase |
| **Cost at Scale**                  | $200-600/month at 10K users             | $25-100/month at 10K users         | Supabase |
| **Offline Support**                | Built-in automatic sync                 | Not built-in                       | Firebase |
| **Testing (RLS/Security)**         | Manual rules testing                    | pgTAP automated SQL tests          | Supabase |

**Final Score: Supabase wins 8 dimensions, Firebase wins 3, Tie on 2.**

### Future Technical Outlook

**Supabase momentum (2025-2026):**

- PostgREST v14 upgrade: ~20% throughput improvement for GET requests
- Broadcast and Presence Authorization for private channels with RLS
- Growing SvelteKit ecosystem with official support and community starters
- AI/vector capabilities via pgvector (future potential for game analytics)

**Industry trends favoring Supabase:**

- Open source BaaS adoption accelerating
- PostgreSQL continuing to dominate as default database choice
- Serverless + edge computing aligning with Supabase Edge Functions (Deno)
- Developer preference shifting toward predictable pricing and portability

_Source: [Supabase January 2026 Update](https://github.com/orgs/supabase/discussions/41796), [Supabase Review 2026](https://hackceleration.com/supabase-review/), [Supabase Changelog](https://supabase.com/changelog)_

### Next Steps

1. **Create PRD** (`/bmad-bmm-create-prd`) — Use this research to inform the Product Requirements Document for the multiplayer epic
2. **Set up Supabase** — Create free tier project, install CLI, run local stack
3. **Prototype auth** — SvelteKit SSR auth with `@supabase/ssr` as a spike to validate integration
4. **Design schema** — Refine the proposed `profiles`, `friendships`, `games`, `game_invitations` tables
5. **Plan architecture** (`/bmad-bmm-create-architecture`) — Formalize the architectural decisions documented in this research

---

**Technical Research Completion Date:** 2026-02-25
**Research Period:** Single-session comprehensive technical analysis
**Source Verification:** All technical facts cited with current (2025-2026) sources
**Technical Confidence Level:** High — based on official documentation, community experience reports, and multi-source cross-validation

_This technical research document serves as the authoritative reference for BaaS platform selection in the CoTuLenh multiplayer epic. It should be referenced during PRD creation, architecture design, and implementation planning._
