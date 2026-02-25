---
stepsCompleted: [1, 2, 3]
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

# Research Report: technical

**Date:** 2026-02-25
**Author:** Noy
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

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

<!-- Content will be appended sequentially through research workflow steps -->
