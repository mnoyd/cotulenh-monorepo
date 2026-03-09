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
  - step-11-complete
classification:
  projectType: Web App (Next.js app in existing monorepo, Supabase-backed multiplayer platform)
  domain: Gaming / Online multiplayer platform
  complexity: Medium-High
  projectContext: Brownfield monorepo, greenfield app
  stack:
    framework: Next.js 15 (App Router, React 19, TypeScript)
    styling: Tailwind CSS 4
    components: shadcn/ui
    stateManagement: Zustand
    backend: Supabase (Auth, PostgreSQL, Realtime, Edge Functions, RLS)
    deployment: Vercel
    gameEngine: cotulenh-core (pure TS, carried from monorepo)
    boardUI: cotulenh-board (vanilla TS, mounted via React ref)
  carryOver:
    - cotulenh-core (as-is)
    - cotulenh-board (as-is)
    - Learn system content/data (UI rebuilt in React)
    - Integration patterns understood but rewritten for multiplayer
  futurePath:
    - English language + i18n (next-intl)
    - React Native for native mobile
    - Self-hostable Supabase
    - AI opponent / analysis via core engine
    - PWA / offline play
    - Abstract realtime layer for scalability
inputDocuments:
  - _bmad-output/planning-artifacts/research/technical-firebase-supabase-baas-for-sveltekit-game-research-2026-02-25.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-05-1309.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-06-1200.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - docs/Architecture.md
  - docs/ai-agent-guide/system-architecture.md
  - docs/ai-agent-guide/package-responsibilities.md
  - docs/ai-agent-guide/README.md
  - docs/README.md
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 2
  projectDocs: 5
  uxDesign: 1
  epics: 1
workflowType: 'prd'
lastEdited: '2026-03-08'
editHistory:
  - date: '2026-03-08'
    changes: 'Post-validation edits: fixed measurability issues in 9 FRs and 5 NFRs, removed implementation leakage from FR3/NFR15/NFR24/NFR25, added FR37 (AI opponent) and FR38 (arena tournaments) to MVP scope, improved traceability in user journeys, updated journey requirements summary table'
  - date: '2026-03-08'
    changes: 'Second edit pass: fixed remaining NFR measurability (NFR6/9/12/13 metrics, NFR16 abstraction), removed subjective language from FR7/FR33/FR38/NFR5/NFR10/NFR20, added AI and arena tournament moments to Journeys 1-3 for full traceability'
---

# Product Requirements Document — CoTuLenh

**Author:** Noy
**Date:** 2026-03-08

## Executive Summary

Co Tu Lenh is a Vietnamese military strategy chess variant with genuine strategic depth — deployable units, terrain mechanics, combined arms — played in school clubs, community groups, and an annual national tournament. It has no serious digital presence. The only online implementation (Board Game Arena) is buggy, slow, and abandoned. A legitimate strategy game with cultural significance is invisible to the world because it has no home on the internet.

This platform changes that. CoTuLenh is the definitive online home for Co Tu Lenh — where the existing community plays, newcomers discover the game, and the player base grows. The long-term ambition: do for Co Tu Lenh what lishogi.org did for Shogi and dedicated platforms did for Xiangqi — elevate a traditional strategy game into a recognized online community.

The experience is modeled after Lichess: board-dominant, zero-chrome, sub-second everything. You land, you learn, you play. No tutorials, no wizards, no friction. The platform launches in Vietnamese — this is a Vietnamese game serving a Vietnamese community first. English and international support follow in the growth phase.

**Target users:**

- **Minh — The BGA Veteran.** Experienced player frustrated with BGA's lag and bugs. Mobile-heavy. Speed and reliability are table stakes.
- **Linh — The Curious Newcomer.** Strategy game fan discovering Co Tu Lenh through search. Starts in the learn system without signing up.
- **Tuan — The Returning Learner.** Tried the game before but had no one to play. Invite links and friend challenges bring him back.

**Small-community reality drives every decision.** The platform must work when 5 people are online, not just 500. Feature priority follows the growth funnel:

1. **Learn system** — teach the game, create new players, no auth required
2. **Invite links** — personal growth loop, friend-to-friend conversion
3. **Friend challenges** — play with people you know, 2 taps
4. **Open lobby** — browse and accept public challenges
5. **Quick Play matchmaking** — viable as player base scales (post-MVP)

The product is a new Next.js application within an existing TypeScript monorepo, backed by Supabase for auth, database, and realtime infrastructure. The game engine (`cotulenh-core`) and board UI (`cotulenh-board`) are carried from the monorepo as shared packages. Everything else — app shell, multiplayer, ratings, social features, learn UI — is built fresh.

### What Makes This Special

Zero competition. No other platform serves this game. First-mover advantage to own the entire digital ecosystem — play, learn, compete, connect — for a game with real depth and Vietnamese cultural identity.

The core insight: the platform must create players, not just serve them. The learn system is the top of the funnel. Every feature decision is filtered through "does this work when the community is small?" Friend challenges over matchmaking queues. Invite links over discovery. Progressive engagement over feature density.

## Project Classification

- **Type:** Web application — new Next.js 15 app in existing TypeScript monorepo
- **Domain:** Gaming / online multiplayer platform
- **Complexity:** Medium-High — realtime gameplay, Glicko-2 ratings, Supabase integration, learn system port
- **Context:** Brownfield monorepo, greenfield app — game engine and board carried as-is, everything else fresh

## Success Criteria

### User Success

- **Minh (BGA veteran):** Plays a rated game with sub-second move sync, never experiences the lag/bugs that plagued BGA. Decides within 3 sessions this is the permanent home.
- **Linh (newcomer):** Completes learn system lessons without signing up, understands the game's strategic depth, plays a real person within the same visit.
- **Tuan (returning learner):** Receives an invite link, signs up in under 30 seconds, plays a friend within 2 minutes of landing.
- **The "aha!" moment:** First real-time game loads instantly, moves sync without perceptible delay, and the board feels like a serious tool — not a toy.

### Business Success

- **3 months:** A core group of 15–30 regular players active weekly. Vietnamese chess community (Facebook groups, BGA refugees) aware the platform exists and linking to it. Learn system converting curious visitors into players.
- **12 months:** Community large and engaged enough to host an externally-organized online tournament on the platform. Interested people and sponsors willing to put money into the tournament — the platform has earned credibility as the legitimate digital home for Co Tu Lenh.

### Technical Success

- Sub-second move synchronization in all network conditions
- Zero dropped games due to platform errors — reconnection handling that preserves game state
- Platform reliability sufficient for competitive/tournament play (fair clocks, consistent game state, no exploitable bugs)
- Supabase free tier sustainable during early growth; architecture ready to scale when needed

### Measurable Outcomes

| Metric | 3-Month Target | 12-Month Target |
|---|---|---|
| Weekly active players | 15–30 | 100+ |
| Learn-to-play conversion (lesson → first real game) | 20%+ | 30%+ |
| Game completion rate (started → finished, no abandonment) | 90%+ | 95%+ |
| Move sync latency (p95) | < 500ms | < 300ms |
| Platform-caused game failures | < 1% | < 0.1% |
| Tournament viability | — | 1 successful tournament hosted |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP — build the ecosystem that creates and retains players. The learn system is the growth engine; multiplayer is the retention engine. Every feature decision filtered through "does this work when 5 people are online?"

**Key Scoping Decisions:**
- Vietnamese only. English deferred to growth phase.
- No Quick Play matchmaking. Friend challenges + open lobby cover the small community.
- Learn system is MVP-critical — the primary player acquisition channel.
- Glicko-2 from day one, but single time control (Rapid) and no historical graphs.
- Activity leaderboard (FR21), not full rating-ranked leaderboard.
- PGN export wired from existing core implementation.

**Resource Requirements:** Solo developer (Noy). Supabase free tier. Vercel deployment.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Linh (newcomer) — learn system without auth, interactive lessons, signup prompt after engagement
- Tuan (returning player) — invite link, signup, friend challenge
- Minh (BGA veteran) — lobby, friend challenge, rated games, sub-second sync
- AI opponent — single-player practice when no human opponents are available
- Arena tournaments — lightweight competitive events for community engagement
- Disconnection recovery — reconnection handling, clock pausing, forfeit window

**Must-Have Capabilities:**
- Learn system — interactive lessons, no auth required, localStorage progress migrating on signup
- Friend challenges via invite links — the primary growth loop
- Open challenge lobby — browse and accept public games
- Realtime gameplay — deploy sessions, alternating turns, clocks, move sync via Supabase Realtime
- Glicko-2 rating system — Rapid only, provisional flag, post-game rating change display
- Rated/casual game toggle
- User profiles with current rating and game history
- PGN export (wired from cotulenh-core)
- Responsive design — desktop sidebar, mobile bottom tab bar, board-centric layout
- Vietnamese language only
- Auth — email/password via Supabase Auth
- AI opponent at selectable difficulty — ensures single-player engagement when community is small
- Arena tournaments — lightweight competitive events that create community engagement and retention
- Activity leaderboard ranked by monthly games played
- Reconnection handling with server-side clock pausing

**Explicitly Cut from MVP:**
- Quick Play matchmaking (queue-based)
- English / i18n infrastructure
- In-game chat
- Rating-ranked leaderboard (replaced by activity leaderboard)
- Multiple time controls (Classical deferred)
- Rating graphs, activity heatmaps, rating history
- Rating backfill migration
- Daily puzzles
- Player search and social features (follow, block)
- Sound and theme customization
- Custom admin/moderation UI

### Post-MVP Features

**Phase 2 — Growth (after community stabilizes):**
- Quick Play matchmaking — viable once 30+ concurrent players
- English language + i18n infrastructure (next-intl)
- In-game chat
- Rating-ranked leaderboard with time control tabs
- Classical time control + per-time-control ratings
- Rating graphs and history on profiles
- Player search
- Sound effects and board theme options
- Full SEO pass — sitemap, structured data, Open Graph cards

**Phase 3 — Expansion (vision):**
- AI analysis engine (deeper engine integration beyond basic opponent)
- React Native mobile app
- Correspondence (async) games
- Self-hosted Supabase
- PWA / offline play
- Spectator mode and live game broadcasting
- Daily puzzles
- Advanced social features (follow, block, friend suggestions)

### Risk Mitigation Strategy

**Technical Risks:**
- *Supabase Realtime reliability for gameplay* — Mitigated by using Broadcast (ephemeral, no DB writes per move) and implementing robust reconnection with state re-fetch. Edge case: simultaneous disconnect handled by server-side game state persistence.
- *Glicko-2 correctness* — Mitigated by using established algorithm reference implementations. Single time control reduces initial complexity. Atomic rating updates via Edge Functions prevent partial state.
- *cotulenh-core/board integration in Next.js* — Carried packages are vanilla TS. Board mounts via React ref. Known pattern, low risk.
- *cotulenh-core in Supabase Edge Functions* — Server-side move validation (NFR17) requires running the game engine in Deno-based Edge Functions. The core is pure TypeScript with no Node-specific dependencies, so compatibility is expected but must be validated early. This is the highest technical integration risk for MVP.

**Market Risks:**
- *"Will they come?"* — Mitigated by the learn system (creates players) and invite links (personal growth loop). Initial seeding from Vietnamese Facebook group and BGA community. Zero competition means any functional platform wins.
- *Small community feels empty* — Mitigated by designing for lobby + friend challenges (no empty queues). Activity leaderboard makes 15 players feel like a community.

**Resource Risks:**
- *Solo developer bottleneck* — Mitigated by Supabase (managed infrastructure), Vercel (zero-config deployment), no custom admin UI. Moderation via Supabase dashboard + Discord. Weekly ops time target: 2–3 hours.
- *Supabase free tier limits* — Mitigated by Broadcast for moves (no DB bandwidth per move), lazy-loaded assets, minimal Edge Function invocations. Architecture ready to upgrade tier when needed.

## User Journeys

*Note: User journeys represent the full product vision, including features like Quick Play matchmaking that are post-MVP. See "Project Scoping & Phased Development" for MVP boundaries.*

### Journey 1: Minh — "Finally, a Real Home"

**Who:** Minh, 28, Ho Chi Minh City. Plays Co Tu Lenh seriously — weekend club matches, occasional regional events. Has been using Board Game Arena for online play for two years. Frustrated daily.

**Opening Scene:** It's 10 PM. Minh opens BGA on his phone to play a quick game. The lobby takes 8 seconds to load. He creates a challenge. Waits. Someone accepts. The game page loads — another 5 seconds. He makes his first move. The board stutters. His opponent's move appears 3 seconds late. By move 12, the game desyncs. He refreshes. The game state is wrong. He rage-quits and opens Facebook to complain in the Co Tu Lenh group. Again.

**Rising Action:** Someone in the Facebook group posts a link: "cotulenh.com — try this." Minh is skeptical. He taps it on his phone. The landing page loads instantly — clean board, no clutter. He signs up: email, password, display name. 15 seconds. He's on the home dashboard. He taps Quick Play. "Searching..." — 4 seconds later, matched. The game page loads. Board dominates his phone screen. Clean. Fast. He deploys his pieces. The clock ticks. He makes a move — it appears on the board instantly.

**Climax:** Move 8. His opponent plays an unexpected infantry advance. The move appears on Minh's screen before he finishes exhaling. No lag. No stutter. He thinks for 20 seconds, counters with a flanking maneuver. The pieces move crisply. The clock is accurate. The game feels *real*. This is what online Co Tu Lenh should have always been.

**Resolution:** Minh loses the game. He doesn't care — he could have resigned mid-game but wanted to play it out. He taps "Rematch." His rating dropped 8 points — he sees "1492 → 1484 (−8)" in red. He wants it back. He plays three more games that night. After the last game, he replays a key sequence move-by-move to understand where his opponent's attack broke through. On Saturday night, he joins the weekly arena tournament — 90 minutes, rapid games, automatic pairings. He finishes 4th out of 12. The standings updated after each game, and the intensity of back-to-back games with different opponents felt like a real event. The next morning, he posts in the Facebook group: "This is it. Delete BGA." He sends invite links to four club members.

**Requirements revealed:** Sub-second move sync, mobile-first responsive design, Quick Play matchmaking (post-MVP), Glicko-2 ratings, rematch flow, invite link sharing, resign/draw offer, game replay, arena tournaments.

---

### Journey 2: Linh — "Wait, This Game Is Actually Deep"

**Who:** Linh, 22, Hanoi. University student, avid chess and Xiangqi player. Stumbles across Co Tu Lenh while searching for "Vietnamese strategy board games" after a conversation with a classmate.

**Opening Scene:** Linh finds cotulenh.com through Google. She's never heard of this game. The landing page shows a board with pieces she doesn't recognize — military units, terrain squares. She's curious but not committed. She's not signing up for anything.

**Rising Action:** She taps "Learn." No login prompt. The learn hub opens — a clean list of subjects. She starts with "Pieces & Movement." An interactive board loads. Instructions appear in the right panel: "The Infantry moves one square in any direction. Tap the infantry to see its moves." She taps. Dots appear on legal squares. She moves the piece. Green flash — correct. Next step. She goes through 3 lessons in 12 minutes. She learns about deployable units — pieces that start off-board and are placed strategically during a deploy phase. "Wait — you choose WHERE to put your pieces? Every game starts differently?" She's hooked.

**Climax:** After the 5th lesson, a subtle prompt appears: "Ready to play someone? Sign up to challenge a real opponent." She signs up — 20 seconds. Her lesson progress migrates invisibly. She's on the home dashboard. She browses the lobby and accepts an open challenge. Her first real game. She loses in 15 minutes but she understands *why* she lost — her deployment was bad, her opponent controlled the center with terrain advantage. She immediately wants to try a different deployment strategy.

**Resolution:** Linh plays 4 games that week. On Wednesday evening, the lobby is empty — no open challenges. She taps "Play vs AI" and picks Medium difficulty. The AI responds instantly. She experiments with aggressive deployments she'd never try against a real person. By the time a human opponent appears in the lobby 10 minutes later, she's already warmed up. She tells two friends: "There's this Vietnamese chess variant where you deploy your own army — it's like chess but with actual strategy about positioning." She's a player now. The learn system created her.

**Requirements revealed:** Learn system without auth, localStorage progress migration on signup, interactive board lessons, learn-to-play conversion prompt, zero-friction signup, lobby as first-game vehicle, AI opponent for practice.

---

### Journey 3: Tuan — "I Finally Have Someone to Play"

**Who:** Tuan, 35, Da Nang. Learned Co Tu Lenh as a kid, played in school. Hasn't played in 10 years. His cousin Minh keeps talking about this game again.

**Opening Scene:** Tuan gets a WhatsApp message from Minh: "Play me tonight" with a link — cotulenh.com/invite/m1nh2024. Tuan remembers the rules vaguely. He hasn't played since high school. He doesn't know any platforms, doesn't follow any groups.

**Rising Action:** Tuan taps the link on his phone. The invite landing page shows: "Minh invited you to play Co Tu Lenh." Board visual in the background. Clean, serious, not a toy. Two buttons: Sign Up / Sign In. Tuan signs up. Minh is automatically added as his friend. The dashboard shows "Minh is online." Tuan taps "Challenge." He picks Casual (he's rusty, no rating pressure). The game starts.

**Climax:** The deploy phase. Tuan forgot about this. He stares at the board — he needs to place his remaining pieces. The deploy counter says "Piece 1 of 3." He places his artillery behind the river. Minh deploys aggressively. The game begins. Tuan gets destroyed but the muscle memory comes back — he remembers terrain advantage, he remembers how the commander moves. He asks for a rematch. This time he deploys better.

**Resolution:** Tuan plays Minh twice a week for the next month. On nights when Minh is busy, Tuan plays against the AI to practice — it's less pressure than a real opponent, and he can experiment with the deployment strategies he's relearning. He joins a Saturday arena and places 8th. He sends the invite link to a college friend. He starts doing lessons to sharpen the rules he forgot. His rating goes from provisional 1500 to an established 1380 — low, but real. He's on the activity leaderboard. He has something to climb. He's back.

**Requirements revealed:** Invite link → signup → auto-friend, friend challenge flow, casual game option, deploy session UX, rematch, learn system for returning players, provisional → established rating transition, AI opponent for practice, arena tournaments.

---

### Journey 4: Phong — "Keeping It Fair"

**Who:** Phong, 40, community elder in the Vietnamese Co Tu Lenh Facebook group. Volunteers to help moderate the platform. Not a developer. Comfortable with Discord and basic web tools.

**Opening Scene:** Phong gets a Discord message from Noy: "Someone reported a player for intentionally disconnecting to avoid losses. Can you check?" Phong opens the Supabase dashboard (he has read access to game records).

**Rising Action:** Phong looks up the reported player's recent games. He sees 4 games in the last week where the player disconnected with under 30 seconds left on their clock while losing. The pattern is clear. He takes screenshots and posts them in the private moderator Discord channel with his recommendation: temporary ban.

**Climax:** Noy reviews the evidence, agrees, and applies the ban through Supabase. The reported player gets a notification on their next login. Phong posts a general reminder in the Facebook group about sportsmanship. No drama. Clean resolution.

**Resolution:** The community trusts that bad behavior gets addressed. Phong checks reports once or twice a week — it takes 10 minutes. The moderation load is low because the community is small and mostly self-policing. As the community grows, the pattern scales: Discord reports → Supabase evidence → action.

**Requirements revealed:** Game history accessible via Supabase dashboard, disconnection tracking in game records, no custom moderation UI needed for MVP, game completion/abandonment data stored.

---

### Journey 5: Noy — "Keeping the Lights On"

**Who:** Noy, solo developer and platform operator. Responsible for everything — code, infrastructure, community, bugs.

**Opening Scene:** Monday morning. Noy opens the Supabase dashboard to check weekend activity. 23 games played, 4 new signups, 0 errors in the Edge Function logs. Learn system: 12 unique lesson sessions, 3 converted to signups. Good weekend.

**Rising Action:** Noy notices one game record with status "abandoned" — both players disconnected at the same time. Likely a Supabase Realtime hiccup. He checks the Realtime channel logs. Brief outage at 2:17 AM, auto-recovered in 8 seconds. Both players reconnected but the game state was stale. He makes a note to improve the reconnection logic — the client should re-fetch game state on reconnect, not just re-subscribe.

**Climax:** A user DMs Noy on Discord: "My rating didn't update after my last game." Noy checks the Edge Function logs. The Glicko-2 calculation succeeded but the client didn't fetch the updated rating after the game ended. Client-side cache issue. Quick fix — invalidate the rating cache after game completion. He deploys the fix, verifies it works with a test game, replies to the user: "Fixed. Your rating should be correct now."

**Resolution:** Noy's weekly routine: check Supabase dashboard for errors, review game abandonment rates, monitor Edge Function performance, respond to Discord reports. 2–3 hours per week. The platform runs itself. His time goes to building new features, not firefighting.

**Requirements revealed:** Supabase dashboard as primary ops tool, Edge Function logging, game state persistence and reconnection recovery, rating calculation reliability, no custom admin UI for MVP, Discord as support channel.

---

### Journey 6: Minh — "The Dropped Connection" (Edge Case)

**Who:** Same Minh, mid-game on mobile, riding the bus home.

**Opening Scene:** Move 22 of a rated game. Minh is winning. The bus enters a tunnel. His 4G drops.

**Rising Action:** A subtle bar appears at the top: "Reconnecting..." The board greys out slightly but stays visible — he can still see the position. His clock pauses (server-side, both clocks freeze on disconnect). 12 seconds pass. The bus exits the tunnel. The bar changes to "Connected." The board restores. His opponent's pending move appears instantly — they moved while Minh was offline.

**Climax:** Minh makes his next move. The game continues seamlessly. No state corruption. No desync. The clock resumes from exactly where it paused.

**Resolution:** Minh wins the game. He never lost confidence that the platform would handle it. If the disconnect had lasted longer than 60 seconds, the system would have forfeited him — but with a clear "disconnection forfeit" status, not a mysterious "game ended" error. Fair, transparent, recoverable.

**Requirements revealed:** Server-side clock pausing on disconnect, 60-second forfeit window, reconnection state recovery, persistent game state, "Reconnecting" UX indicator, optimistic board state preservation.

---

### Journey Requirements Summary

*Capabilities marked (post-MVP) are covered by the full product vision but not included in Phase 1. See scoping section for details.*

| Capability Area | Journeys That Require It |
|---|---|
| Realtime move sync (sub-second) | Minh, Linh, Tuan, Disconnection |
| Learn system (no auth) | Linh, Tuan |
| Invite link → signup → auto-friend | Tuan |
| Quick Play matchmaking (post-MVP) | Minh |
| Friend challenge | Tuan, Minh |
| Open lobby | Minh, Linh |
| AI opponent | Linh, Tuan |
| Arena tournaments | Minh, Tuan |
| Glicko-2 rating system | Minh, Linh, Tuan |
| Deploy session UX | Tuan, Linh, Minh |
| Reconnection handling | Disconnection |
| Game history & completion tracking | Phong, Noy |
| Supabase dashboard (ops/moderation) | Phong, Noy |
| Casual/rated toggle | Tuan |
| Rematch flow | Minh, Tuan |
| Resign / draw offer | Minh |
| Game replay | Minh |
| Post-game rating display | Minh |
| Mobile-first responsive | Minh, Tuan, Disconnection |
| Progress migration (localStorage → account) | Linh |

## Web Application Requirements

### Project-Type Overview

Next.js 15 App Router web application — SSR-capable for SEO-critical pages (landing, learn system), client-side SPA behavior for authenticated gameplay. Supabase Realtime for multiplayer. Online-only for MVP, no PWA or offline support.

### Browser Support

- **Target:** Modern evergreen browsers only — Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile browsers:** Chrome for Android, Safari for iOS (primary mobile targets)
- **Not supported:** IE, legacy Edge, UC Browser, Opera Mini
- **Minimum JS:** ES2020+ (no legacy transpilation)
- **CSS:** Tailwind CSS 4, CSS custom properties, CSS Grid/Flexbox — no vendor prefix concerns for modern targets

### Responsive Design

- **Mobile (<640px):** Board full-width, bottom tab bar (56px), single-column stacked content
- **Tablet (640–1024px):** Board + side panel, left sidebar (48px)
- **Desktop (>1024px):** Board + tabbed right panel, left sidebar (48px)
- **Max content width:** 1200px
- **Touch targets:** 44x44px minimum on mobile, 8px gap between adjacent targets

### Performance Strategy

- System fonts only — zero font loading delay
- Board and game engine loaded eagerly on game routes, lazy-loaded elsewhere
- Skeleton screens for all async content, never spinners for page loads
- Specific performance targets defined in NFR1–NFR7

### SEO Strategy

- **MVP:** Landing page and learn hub SSR-rendered with basic meta tags (`title`, `description`). Vietnamese `lang` attribute. Two to three routes — minimal overhead, maximum discoverability in a zero-competition niche.
- **Post-MVP:** Full SEO pass — auto-generated sitemap, structured data, Open Graph social cards for game results and profiles, `hreflang` tags when English is added, lesson-level page indexing once content stabilizes.
- **All other pages (game, lobby, dashboard, settings, profile):** Client-only rendering, no SSR needed.

### Accessibility

- **Target:** WCAG 2.1 AA
- **Contrast:** 4.5:1 minimum for text, 3:1 for interactive elements, both themes independently verified
- **Keyboard:** Full keyboard navigation, visible focus rings, logical tab order
- **Board:** Each square focusable with `aria-label`, arrow key navigation, move count announced on piece selection
- **Motion:** Respect `prefers-reduced-motion` — disable animations, pulse effects
- **Language:** `lang="vi"` for MVP. Switches dynamically when i18n is added.

### Real-Time Architecture

- Supabase Realtime Broadcast for ephemeral game moves (no DB writes per move)
- Supabase Realtime Postgres Changes for lobby updates, challenge status, friend online presence
- Single WebSocket connection per client with multiple channel subscriptions (game channel, lobby channel, presence channel)
- Reconnection: auto-reconnect with exponential backoff, re-fetch game state on reconnect (not just re-subscribe)

### Implementation Considerations

- **Language:** Vietnamese only for MVP. All user-facing strings hardcoded in Vietnamese. i18n infrastructure (next-intl, message files, language toggle) deferred to Phase 2.
- **Authentication:** Supabase Auth — email/password for MVP. Session management via Supabase SSR helpers. Anonymous learn-system progress in localStorage, migrated on signup.
- **State management:** Zustand for client-side game state, Supabase for server-side persistence. Game engine (cotulenh-core) runs client-side, server validates via Edge Functions.
- **Deployment:** Vercel — auto-deploy from main branch. Preview deployments for PRs.

## Functional Requirements

### Learning & Education

- **FR1:** Visitors can access the learn system and complete interactive lessons without creating an account
- **FR2:** Learners can interact with an in-lesson board to practice piece movements, placement, and game mechanics
- **FR3:** Learners can track their lesson progress across sessions without an account
- **FR4:** Learners who sign up can have their anonymous lesson progress automatically migrated to their account
- **FR5:** Learners who complete 3 or more lessons can see a contextual prompt to sign up and play a real opponent

### Game Play

- **FR6:** Players can participate in a deploy session at the start of each game, placing deployable pieces on their side of the board, with the game clock running during deployment
- **FR7:** Players can make moves in alternating turns with synchronization to their opponent's board
- **FR8:** Players can see legal move indicators when selecting a piece
- **FR9:** Players can play under time-controlled conditions with synchronized countdown clocks
- **FR10:** Players can resign, offer a draw, or request a takeback during a game
- **FR11:** Players can request and accept/decline a rematch after a game ends
- **FR12:** Players can choose to play a rated or casual game when creating a challenge

### Matchmaking & Challenges

- **FR13:** Players can create an open challenge with Rapid time control presets and publish it to the lobby
- **FR14:** Players can browse open challenges in the lobby and accept one to start a game
- **FR15:** Players can send a friend challenge directly to a specific player
- **FR16:** Players can generate and share an invite link that directs the recipient to sign up and become their friend
- **FR17:** Users who sign up via an invite link are automatically connected as friends with the inviter

### Rating & Progression

- **FR18:** Players earn a Glicko-2 rating for the Rapid time control, updated after each rated game
- **FR19:** Players with fewer than 30 rated games are flagged as provisional with a visible indicator
- **FR20:** Players can see their rating change (gain/loss with delta) immediately after a rated game ends
- **FR21:** Players can view an activity leaderboard ranked by games played in the current month

### User Management

- **FR22:** Visitors can create an account with email and password
- **FR23:** Players can sign in and maintain an authenticated session
- **FR24:** Players can reset their password via email link
- **FR25:** Players can view their own and other players' profiles showing current rating, game count, and game history
- **FR26:** Players can manage a friends list with online/offline status indicators
- **FR27:** Players can challenge online friends directly from the friends list

### Game History & Review

- **FR28:** Players can view a list of their completed games with opponent, result, and rating change
- **FR29:** Players can replay a completed game move-by-move using the move list
- **FR30:** Players can export a game's move record in PGN format

### Platform & Connectivity

- **FR31:** Players who lose connection during a game are automatically reconnected with game state preserved
- **FR32:** Both players' clocks pause during a disconnection, with automatic forfeit after a 60-second timeout window
- **FR33:** The system records game abandonments (browser close, timeout) with a distinct status from disconnection forfeits
- **FR34:** Players can navigate the platform using a persistent sidebar (desktop) or bottom tab bar (mobile)
- **FR35:** Players see a board-centric home dashboard with single-tap navigation to play, active games, and recent games
- **FR36:** The game board occupies at least 60% of the viewport on all screen sizes during gameplay, with no UI elements overlapping the board area

### AI & Competition

- **FR37:** Players can start a game against an AI opponent at selectable difficulty levels when no human opponents are available
- **FR38:** Players can join and compete in time-limited arena tournaments where pairings rotate automatically and standings update within 5 seconds of each game's completion

## Non-Functional Requirements

### Performance

- **NFR1:** Move synchronization between players completes in under 500ms at the 95th percentile
- **NFR2:** Game page reaches Time to Interactive in under 3 seconds on a 4G mobile connection
- **NFR3:** Landing page First Contentful Paint under 1.5 seconds, Largest Contentful Paint under 2.5 seconds
- **NFR4:** Initial JavaScript bundle size under 200KB gzipped, ensuring fast load on mobile networks
- **NFR5:** Board first render completes in under 500ms after page load
- **NFR6:** Clock display updates at least once per second with clock drift between players not exceeding 500ms
- **NFR7:** Lobby challenge list updates in real-time — accepted/cancelled challenges disappear within 1 second

### Reliability

- **NFR8:** Game state persists server-side with a 99.9% recovery success rate — no game is lost due to a single client disconnection, verified by automated reconnection tests under simulated network interruption
- **NFR9:** Disconnected players automatically reconnect with full game state restored, including correct clock values, within 5 seconds of network recovery
- **NFR10:** If a player remains disconnected beyond 60 seconds, the system forfeits the game with a "disconnection forfeit" status visible to both players
- **NFR11:** Rating updates are atomic with game completion — a crash between game end and rating write must not leave ratings in a partial state
- **NFR12:** Platform-caused game failures (bugs, crashes, desyncs) occur in fewer than 1% of completed games, as classified by server error logs correlated with game completion records
- **NFR13:** Game completion rate — started games that end via checkmate, resignation, draw agreement, or timeout, excluding disconnection forfeits — exceeds 90%

### Security

- **NFR14:** All client-server communication uses HTTPS/WSS — no unencrypted data in transit
- **NFR15:** User passwords are hashed and never stored or transmitted in plaintext
- **NFR16:** Data access controls enforce that players can only read or modify their own profile data and only submit actions for games in which they are a participant
- **NFR17:** Game moves are validated server-side — the client cannot submit illegal moves or moves out of turn
- **NFR18:** Authentication endpoints enforce rate limiting of no more than 5 failed attempts per minute per IP address, with progressive lockout after 15 failed attempts per hour

### Accessibility

- **NFR19:** All text meets WCAG 2.1 AA contrast ratios — 4.5:1 for body text, 3:1 for interactive elements
- **NFR20:** All interactive elements are keyboard-navigable with focus indicators meeting WCAG 2.1 AA Success Criterion 2.4.7
- **NFR21:** Board squares are individually focusable with descriptive labels (e.g., "B4: Red Infantry")
- **NFR22:** Animations and pulse effects respect `prefers-reduced-motion` system setting
- **NFR23:** Game state changes (moves, clock critical, deploy progress) are announced via ARIA live regions

### Scalability (Architectural Guardrails)

- **NFR24:** Architecture supports scaling from 5 to 500 concurrent users without requiring a rewrite, verified by load tests sustaining 500 concurrent WebSocket connections with under 1 second move latency at the 99th percentile
- **NFR25:** Realtime game moves use ephemeral messaging rather than database writes, keeping database operations per game under 10 (create, state snapshots, result) regardless of move count
