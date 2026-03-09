---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
inputDocuments: []
session_topic: 'Future Feature Set for Commander Chess Web App'
session_goals: 'Generate ambitious, concrete feature ideas that define what the app becomes'
selected_approach: 'user-selected'
techniques_used: ['Mind Mapping']
ideas_generated: [68]
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Noy
**Date:** 2026-03-06

## Session Overview

**Topic:** Future Feature Set for Commander Chess Web App
**Goals:** Generate ambitious, concrete feature ideas that define what the app becomes

### Context Guidance

_No context file provided. Ground-up reimagining of all capabilities and features._

### Session Setup

We are brainstorming the complete future feature set of the Commander Chess web app — what it can do for users now and what it will become. Pure product/feature focus, no architecture or technical direction. Lichess.org used as the primary reference platform.

## Technique Selection

**Approach:** User-Selected Techniques
**Selected Techniques:**

- **Mind Mapping:** Branch ideas from a central concept — "Future Features of Commander Chess" — to discover connections, see the full landscape, and expand thinking into unexpected territory.

**Selection Rationale:** Mind mapping is ideal for a ground-up feature reimagining because it maps the entire feature universe while preserving connections between domains.

## Technique Execution Results

**Mind Mapping — Full Feature Inventory:**

### Central Node: Commander Chess Platform

Three core pillars identified: **Play, Learn, Tournaments** — expanded to 8 branches after Lichess analysis: Play, Learn, Tournaments, Watch/Community, Analysis, Profile/Progression, Tools, Settings.

```
        WATCH        PLAY        LEARN
           \          |          /
            \         |         /
     SOCIAL──── CO TU LENH ────ANALYSIS
            /         |         \
           /          |          \
     TOURNAMENTS    TOOLS     PROFILE/PROGRESSION
```

---

## Branch 1: PLAY (13 Ideas)

**[Play #1]**: Quick Pairing / Lobby
_Concept_: Auto-match players by rating + time control. One-click to find a game.
_Novelty_: Adapted for Co Tu Lenh — may need to match by army config or terrain preference too.

**[Play #2]**: Play with a Friend
_Concept_: Generate shareable challenge link with customizable settings (time control, terrain, army config, rated/casual).
_Novelty_: Co Tu Lenh-specific options in the challenge creation.

**[Play #3]**: Play vs Computer / Bots
_Concept_: AI opponents at various difficulty levels. Community-created bots with different playstyles.
_Novelty_: Bots could specialize in different Co Tu Lenh strategies (aggressive air force, defensive terrain play, etc.)

**[Play #4]**: Correspondence
_Concept_: Async play, days per move. Perfect for Co Tu Lenh's complexity — gives time to think through hidden information.
_Novelty_: Conditional moves adapted for fog-of-war mechanics.

**[Play #5]**: Rematch
_Concept_: One-click rechallenge after game ends.

**[Play #6]**: Time Controls
_Concept_: Full range — Blitz, Rapid, Classical, Correspondence, Custom. Co Tu Lenh games likely run longer than chess, so time controls shifted accordingly.

**[Play #7]**: Clock Systems
_Concept_: Fischer increment, Bronstein delay, Simple delay.

**[Play #8]**: Premoves
_Concept_: Queue your next move during opponent's turn.

**[Play #9]**: Move Confirmation
_Concept_: Optional confirmation before move is sent.

**[Play #10]**: Draw / Resign / Takeback
_Concept_: Standard game management — draw offers, resignation with confirmation, takeback requests (configurable).

**[Play #11]**: Zen Mode
_Concept_: Hide opponent name, rating, chat. Pure focus on the board.

**[Play #12]**: In-Game Chat
_Concept_: Toggleable chat during games.

**[Play #13]**: Spectator Mode
_Concept_: Others can watch live games with spectator count displayed. Fog-of-war creates interesting spectator design — spectators see full board or one side's perspective?

---

## Branch 2: LEARN (10 Ideas)

**[Learn #14]**: Interactive Lessons (EXISTS)
_Concept_: Step-by-step lessons teaching Co Tu Lenh rules, piece movement, terrain effects, command cards. Already implemented.
_Novelty_: Foundation exists — future expansion into advanced strategy lessons.

**[Learn #15]**: Puzzles — Enhanced
_Concept_: Tactical puzzles from real games with rating system. Currently exists but too simple. Enhance with puzzle rating (Glicko-2), puzzle themes (terrain tactics, hidden piece discovery, command card timing), extraction from real games.
_Novelty_: Co Tu Lenh puzzles are fundamentally different from chess — fog of war means puzzle setup itself is a design challenge.

**[Learn #16]**: Puzzle Dashboard
_Concept_: Analytics showing strengths/weaknesses across puzzle themes. Track improvement over time.
_Novelty_: Could reveal if a player is weak at air force tactics vs ground maneuvers vs terrain exploitation.

**[Learn #17]**: Puzzle Modes — Storm / Streak / Racer
_Concept_: Timed puzzle solving (Storm), survival mode (Streak), multiplayer racing (Racer).
_Novelty_: Maybe/future — depends on puzzle volume.

**[Learn #18]**: Practice Drills
_Concept_: Themed exercises — endgame scenarios, terrain-specific tactics, command card combinations.
_Novelty_: Maybe/future.

**[Learn #19]**: Coordinate Training
_Concept_: Board familiarity drills for Co Tu Lenh's board layout.
_Novelty_: Maybe/future — less critical than chess since the board is different.

**[Learn #20]**: Studies
_Concept_: Collaborative, persistent analysis notebooks with chapters. Users create and share strategy breakdowns.
_Novelty_: Maybe/future — powerful for community knowledge building.

**[Learn #21]**: Coach Directory
_Concept_: Find and connect with Co Tu Lenh coaches/experts.
_Novelty_: Maybe/future — depends on community size.

**[Learn #22]**: Classes
_Concept_: Teacher/student groups with homework assignments and progress tracking.
_Novelty_: Maybe/future.

**[Learn #23]**: Learn from Mistakes
_Concept_: Post-game analysis highlighting blunders with correct lines. Requires a Co Tu Lenh engine.
_Novelty_: High value but blocked by engine development. Nice to have for the future.

---

## Branch 3: TOURNAMENTS (6 Ideas)

**[Tournament #24]**: Arena Tournament
_Concept_: Time-limited, continuous pairing. Play as many games as possible. Win streaks for bonus points. Berserk mode (sacrifice clock for bonus points on win). Pause/resume — leave and rejoin freely.
_Novelty_: Best format for small communities — works even with 4-5 players since pairing is continuous, not round-based.

**[Tournament #25]**: Swiss Tournament
_Concept_: Fixed rounds, no repeat opponents, proper standings. More formal than arena.
_Novelty_: Good for when community grows. Needs minimum ~8 players to work well.

**[Tournament #26]**: Tournament Calendar
_Concept_: Schedule and display all upcoming tournaments. Recurring daily/weekly auto-scheduled events.
_Novelty_: Recurring scheduled tournaments create community rhythm — "every Saturday 8pm" becomes a habit even for 10 players.

**[Tournament #27]**: Team Battles
_Concept_: Inter-team arena competitions. Top N scorers per team count toward team total.
_Novelty_: Future — needs teams feature and larger community first.

**[Tournament #28]**: Simuls
_Concept_: One strong player vs many challengers simultaneously.
_Novelty_: Future — fun community events, works great with small player base actually (1 host + 5-10 challengers).

**[Tournament #29]**: Shield Tournaments
_Concept_: Recurring events where the winner holds the "shield" title until next edition.
_Novelty_: Future — creates community prestige and regular events.

---

## Branch 4: WATCH / COMMUNITY (7 Ideas)

**[Watch #30]**: Live TV
_Concept_: Automatically broadcast the top-rated active game on the platform. Channel always showing the best game happening right now.
_Novelty_: With small community this becomes "the game everyone watches" — creates shared moments. Spectator fog-of-war perspective is a unique design question.

**[Watch #31]**: Current Games Browser
_Concept_: Browse all currently active games on the platform. Click to spectate any game.
_Novelty_: Small community means this list is intimate — you recognize the players.

**[Watch #32]**: Teams
_Concept_: Create/join teams. Team forums, team chat, team tournaments.
_Novelty_: Future — gives community structure as it grows.

**[Watch #33]**: Broadcasts
_Concept_: Relay OTB Co Tu Lenh tournament games live on the platform.
_Novelty_: Future — when physical tournaments happen.

**[Watch #34]**: Streamers Directory
_Concept_: Directory of Co Tu Lenh streamers with Twitch/YouTube integration. Featured on homepage when live.
_Novelty_: Future — grows with community.

**[Watch #35]**: Forum
_Concept_: Discussion categories — strategy discussion, game analysis, feedback, off-topic.
_Novelty_: Future.

**[Watch #36]**: User Blogs
_Concept_: Any user can write and publish strategy articles, game reviews, etc.
_Novelty_: Future.

---

## Branch 5: ANALYSIS (6 Ideas)

**[Analysis #37]**: Analysis Board
_Concept_: Interactive board for free analysis. Replay games, add variations, explore alternative lines. Without engine: manual self-analysis by replaying and branching moves.
_Novelty_: Even without engine, self-play analysis with move branching is valuable. Engine evaluation layered on later.

**[Analysis #38]**: Post-Game Analysis
_Concept_: After game ends, replay with blunder/mistake/inaccuracy classification and accuracy %. Requires engine.
_Novelty_: Future — engine-dependent. For now, manual replay with move list is the baseline.

**[Analysis #39]**: Opening Explorer
_Concept_: Database of Co Tu Lenh openings with win/draw/loss stats per move, built from all games played on the platform.
_Novelty_: Doesn't need an engine — just game data. As games accumulate, this builds itself. Unique to Co Tu Lenh — no one else has this data.

**[Analysis #40]**: Board Editor
_Concept_: Set up any position, continue to analysis or play from there.
_Novelty_: Useful for studying specific scenarios, sharing positions, creating puzzles.

**[Analysis #41]**: Endgame Tablebase
_Concept_: Perfect play lookup for endgame positions. Requires deep engine work.
_Novelty_: Far future — aspirational.

**[Analysis #42]**: Cloud Evaluation
_Concept_: Pre-computed positions stored server-side for instant analysis.
_Novelty_: Far future — requires engine first.

---

## Branch 6: PROFILE / PROGRESSION (9 Ideas)

**[Profile #43]**: Glicko-2 Rating System
_Concept_: Separate ratings per time control. Provisional ratings for new players. Rating graphs over time.
_Novelty_: Standard but essential — gives players progression and matchmaking quality.

**[Profile #44]**: Leaderboards
_Concept_: Top players per time control. Activity requirements to stay on board.
_Novelty_: Small community means getting on the leaderboard is achievable — motivating.

**[Profile #45]**: Game Insights / Analytics
_Concept_: Win% by opening setup, performance by game phase, stats over time. Built from personal game history.
_Novelty_: Doesn't need engine — just game data. Co Tu Lenh-specific: stats by army configuration, terrain type, command card usage.

**[Profile #46]**: Friends / Following
_Concept_: Follow other players, see their activity, get notified when they're online.
_Novelty_: Critical for small community — knowing when your regular opponents are online.

**[Profile #47]**: Direct Messaging
_Concept_: Private inbox between users.

**[Profile #48]**: User Notes
_Concept_: Private notes on other players' profiles — only you see them.
_Novelty_: "This player always opens with air force rush" — personal scouting.

**[Profile #49]**: Block Users
_Concept_: Prevent messages and challenges from specific users.

**[Profile #50]**: Flairs / Cosmetics
_Concept_: Profile customization — avatars, badges, patron icons, title display.

**[Profile #51]**: Activity Heatmap
_Concept_: Calendar showing playing activity over time. Like GitHub's contribution graph.

---

## Branch 7: TOOLS (6 Ideas)

**[Tools #52]**: Import Game
_Concept_: Paste game notation, get browsable replay with analysis board.
_Novelty_: Needs Co Tu Lenh-specific notation format.

**[Tools #53]**: Advanced Game Search
_Concept_: Filter all games by players, rating range, time control, date, result, army configuration, terrain.
_Novelty_: Co Tu Lenh-specific filters — search by terrain type, command cards used, army config.

**[Tools #54]**: Export / Download
_Concept_: Export personal games in standard notation format.

**[Tools #55]**: Open Database
_Concept_: All rated games freely downloadable. Monthly dumps.
_Novelty_: Follows Lichess's open data philosophy. Enables community research and engine development.

**[Tools #56]**: API
_Concept_: Full REST API — play via API, create bots, bulk tournament pairing, real-time streaming.
_Novelty_: Enables ecosystem growth — third-party tools, bots, mobile apps, external boards.

**[Tools #57]**: Embed Widgets
_Concept_: Embed live games, puzzles, TV on external websites.
_Novelty_: Community spread — forums, blogs, social media can embed Co Tu Lenh content.

---

## Branch 8: SETTINGS (7 Ideas)

**[Settings #58]**: Board Themes
_Concept_: Multiple board visual themes.

**[Settings #59]**: Piece Sets
_Concept_: Multiple piece art styles.

**[Settings #60]**: Sound Packs
_Concept_: Different sound sets — standard, retro, minimal, etc.

**[Settings #61]**: Game Behavior Settings
_Concept_: Premoves on/off, move confirmation, takeback policy, auto-promotion.

**[Settings #62]**: Zen Mode Toggle
_Concept_: Hide opponent info as default preference.

**[Settings #63]**: Kid Mode
_Concept_: Disables all communication features for child safety.

**[Settings #64]**: Language Support
_Concept_: Vietnamese and English as primary. Community translations for more.

---

## Branch 9: FAIR PLAY (4 Ideas)

**[Fair Play #65]**: Anti-Cheat Detection
_Concept_: Statistical + behavioral anomaly detection systems.
_Novelty_: Future — needs engine first to detect engine-assisted play. Behavioral analysis can start earlier.

**[Fair Play #66]**: Rating Refunds
_Concept_: When cheater is caught, opponents get rating refunded.

**[Fair Play #67]**: Report + Appeal System
_Concept_: Users can report, human moderators review appeals.

**[Fair Play #68]**: Multi-Account Detection
_Concept_: Detect players using multiple accounts for rating manipulation.

---

## MVP Prioritization

### Must Have (Launch)

| # | Feature | Why |
|---|---------|-----|
| #1 | Quick Pairing / Lobby | Can't play without finding opponents |
| #2 | Play with a Friend | Shareable link — how you grow from zero |
| #3 | Play vs Computer | Players need someone to play when nobody's online — critical for small community |
| #5 | Rematch | Retention — one more game |
| #6 | Time Controls | At least Rapid + Classical + Correspondence |
| #8 | Premoves | Core quality-of-life |
| #9 | Move Confirmation | Essential for Co Tu Lenh's complexity |
| #10 | Draw / Resign / Takeback | Basic game management |
| #14 | Interactive Lessons | Already exists — teaches new players the rules |
| #43 | Glicko-2 Ratings | Matchmaking quality + progression feeling |
| #44 | Leaderboards | Gives players something to chase |
| #46 | Friends / Following | Know when your opponents are online |
| #64 | Language Support | Vietnamese + English minimum |

### Should Have (Soon After)

| # | Feature | Why |
|---|---------|-----|
| #4 | Correspondence | Async play solves the "nobody online right now" problem |
| #11 | Zen Mode | Quick win, low effort |
| #12 | In-Game Chat | Social glue |
| #13 | Spectator Mode | Community building |
| #15 | Puzzles Enhanced | Already exists, enhance over time |
| #24 | Arena Tournament | Works with small player count |
| #26 | Tournament Calendar | Recurring events create community habits |
| #30 | Live TV | "Something is always happening" feeling |
| #37 | Analysis Board | Self-play replay, no engine needed |
| #47 | Direct Messaging | Social basics |
| #58-61 | Board/Piece/Sound themes | Polish and personalization |

### Everything Else = Future

The remaining ~35 features need community scale, engine development, or both.

---

## Ground-Up UX/UI Architecture

### Design Vibe

Utilitarian command center. Lichess-inspired — zero decorative fluff, no gradients, no card shadows, no gamified UI. High contrast, dense information, monochrome with one accent color. It should feel like a tool built by players for players — fast, sharp, serious.

### Navigation Shell (Design Now, Never Change)

**Large Screen (>1024px):** Left sidebar, 48-56px collapsed (icons only, tooltip on hover), 180-200px expanded (icons + labels). Active indicator: left border accent bar. Separator between main sections and utility (Profile/Settings). Future sections appear as new icons — no restructure needed.

**Small Screen (<1024px):** Bottom tab bar, 56px height, 5 icons max visible. When more sections exist → last icon becomes "More" (⋯) opening a drawer. Active tab: accent color icon + label. Inactive: muted icon, no label.

```
Desktop:                    Mobile:
┌────────┐                  ┌────────────────────────┐
│  LOGO  │                  │      CONTENT           │
│────────│                  │                        │
│  Home  │                  ├────────────────────────┤
│  Play  │                  │ 🏠 ⚔️ 📚 👤 ⚙️        │
│  Learn │                  └────────────────────────┘
│  ...   │
│────────│
│ Profile│
│Settings│
└────────┘
```

---

### Screen 1: Home / Dashboard

**Vibe:** Command center landing. Not a marketing page. You land here and immediately see: what can I do + what's happening.

**Large Screen:** Two columns (60/40). Left: Quick Actions (2x2 grid of flat bordered buttons), Daily Puzzle (interactive mini board), Recent Games (data rows). Right: Live Panel (mini board showing Live TV or correspondence game), Online Friends (list with status dots), Leaderboard (top 5).

**Small Screen:** Single column stacked. Quick Actions 2x2 grid. Daily Puzzle full width. Recent Games rows. Online Friends + Leaderboard collapsed as expandable rows. Live mini board hidden on mobile home.

---

### Screen 2: Play — Lobby / Game Creation

**Vibe:** Fast. Maximum 2 clicks to start playing.

**Large Screen:** Create a Game form at top (time control preset buttons in a row, mode radio, color radio, big "Find Opponent" button). Below: Open Challenges table + Games In Progress table side by side. No tabs, everything visible at once.

**Small Screen:** Same form stacked vertically. Time control buttons wrap 3 per row. "Find Opponent" button full width, always visible without scrolling. Open Challenges + Live Games as collapsible sections.

**Future additions (no restructure):** Army config dropdown, terrain selection, correspondence time controls — all appear as new inline form fields.

---

### Screen 3: Game Screen (THE Critical Screen — 80% of User Time)

**Vibe:** The board is sacred. Everything exists to serve the board. Zero distraction.

**Large Screen:**
```
┌──┬──────────────────────────────────┬──────────────────────┐
│  │  Opponent bar (name, rating, ⏱)  │ [Moves][Chat]        │
│N │                                  │ Tab content           │
│A │         BOARD                    │ (moves list,          │
│V │    (max height, aspect ratio,    │  chat messages)       │
│  │     centered)                    │                      │
│  │                                  │──────────────────────│
│  │  Your bar (name, rating, ⏱)     │ Game actions + nav    │
└──┴──────────────────────────────────┴──────────────────────┘
```

- Board NEVER resizes when right panel content changes
- Right panel: fixed 280-320px. Plain text tabs (active = bold + underline, no styling)
- MVP tabs: Moves | Chat. Future tabs just appear: Cards | Spectators | Engine | Explorer
- Player bars: name, rating, clock. Clock prominent. Low time (<30s) → danger color. <10s → danger background.
- Game action buttons (resign, draw, takeback): flat icon buttons, tooltip on hover. Resign/Draw require inline confirmation (button row replaces itself with Yes/No).
- Move navigation: ◄◄ ◄ ► ►► icons bottom of right panel

**Small Screen:** Board full viewport width as square. Player bars compressed single line above/below. Right panel moves below board as scrollable section. Same tabs, same behavior. Bottom nav stays visible. Landscape: board left, tabs right.

---

### Screen 4: Post-Game Screen

**Vibe:** Instant feedback, instant rematch.

Result overlay appears ON the board (semi-transparent backdrop). Rating change: old → new with color. Primary action: Rematch (accent). Secondary: New Game. Tertiary: Analysis/Replay. Board beneath overlay remains navigable — click away overlay to replay.

**Small Screen:** Result banner slides in above board (compact). Action buttons below board in a row.

---

### Screen 5: Learn — Hub

**Vibe:** Clean, focused progression. One clear next action.

**Large Screen:** "Continue Learning" banner at top (golden path — current lesson, progress bar, big Continue button). Below: grid of learning sections (Lessons, Puzzles). Future sections appear as new grid items (Practice, Studies, Coach, Classes).

**Small Screen:** Single column stack. Continue banner full width. Section items full width stacked.

---

### Screen 6: Learn — Lesson View

**Vibe:** Interactive teaching. Board + instruction.

**Same layout as game screen** — board left/top, lesson content right/bottom. Right panel: lesson text, step counter, hint button, progress bar. Correct move → green flash. Wrong → red flash + hint.

**Small Screen:** Board full width top. Lesson text below.

---

### Screen 7: Learn — Puzzle View

**Vibe:** Identical to game screen layout. Puzzle IS a game position.

Same game screen layout. Right panel: puzzle info (rating, theme, prompt), hint/give up buttons, post-solve rating change + next puzzle. Future puzzle modes (Storm/Streak/Racer) change right panel content only.

---

### Screen 8: Profile

**Vibe:** Data-dense player card.

**Large Screen:** Single wide column (no right sidebar). Player header (name, flag, join date, W/L/D, action buttons). Rating graph (interactive, time range toggles). Activity heatmap (GitHub-style). Recent games (data table, click → replay). Future sections (Game Insights, Opening Stats) stack below.

**Small Screen:** Same content, single column. Graph scales full width. Heatmap scrollable. Games as compact cards.

---

### Screen 9: Settings

**Vibe:** Functional, grouped, one scrollable page.

Section headers: Display (theme, board, pieces), Sound (pack, volume), Game Behavior (premoves, move confirm, takebacks), Language, Account. Visual selectors for board/piece themes. Toggles for on/off. Future sections just appear as new groups.

---

### Screen 10: Analysis Board (Future — Shell Designed Now)

**Identical to game screen layout.** Board left/top, tools right/bottom. Tabs: Moves | Engine | Explorer (appear as features ship). FEN input + PGN import/export at bottom of right panel.

---

## Overlay & Interaction Strategy

### Rule 1: No Modals Unless Irreversible

Centered modals with backdrop ONLY for: close/delete account, leave rated game in progress, delete something permanent. Everything else is inline, contextual, or toast-based.

### Rule 2: Inline Confirmations for Game Actions

Button row replaces itself with "Are you sure? [Yes] [No]". No overlay, no popup. Applies to: Resign, Draw, Takeback, Abort.

### Rule 3: Toast Notifications for Incoming Events

**Position:** Bottom-left for game events. Top-center for system status.
**Actionable toasts** (accept/decline) stay until acted on or expired.
**Info toasts** auto-dismiss after 3 seconds.
**Max stack:** 3 visible, newest on top.
**Never overlap the board.**

| Event | Toast Content |
|---|---|
| Draw offered | "Draw offered [Accept] [Decline]" |
| Takeback requested | "Takeback? [Accept] [Decline]" |
| Challenge received | "player2 challenges you 10+5 [Accept] [Decline]" |
| Game starting | "Game found! Redirecting..." |
| Your turn (correspondence) | "Your turn vs player2" |
| Tournament starting | "Arena starts in 5 min [Join]" |
| Rating change | "+12 rating" (auto-dismiss 3s) |
| Connection lost | "Reconnecting..." (persistent) |
| Connection restored | "Connected" (auto-dismiss 2s) |

**Mobile toasts:** Banner between board and tab content. Not overlapping board or nav.

### Rule 4: Dropdowns / Popovers for Context Menus

Click player name → mini profile card popover (View Profile, Challenge, Follow, Block, Report). Click notification bell → notification panel. Click avatar → account menu. Anchored to trigger element. Click outside or Escape to dismiss. **Mobile: all popovers become bottom drawers.**

### Rule 5: Bottom Drawers (Mobile Only)

Slide up from bottom. Drag bar at top. Backdrop behind. Max 70% viewport. For: player menus, notifications, share, custom time control, overflow nav items.

### Rule 6: Inline Expansion for Forms

Custom time control, army config, terrain selection, "show more" on lists, report forms, tournament details — all expand inline, pushing content down. No overlay.

### Rule 7: Full Page for Complex Flows

Create tournament, create study, signup/login, profile page, game search — full page within nav shell (sidebar still visible). Back button always works.

### Rule 8: Promotion Selector

On-board — piece choices appear directly on the promotion square. No modal, no off-board UI.

### Rule 9: Connection / Loading States

**Loading:** Skeleton screens (grey rectangles matching content layout). Never a spinner. Never blank.
**Reconnecting:** Persistent top banner. Board visible but greyed/disabled.
**Game searching:** Button text changes to "Searching..." with subtle pulse.

---

## Complete Decision Matrix

| Interaction Type | Desktop | Mobile |
|---|---|---|
| Destructive irreversible | Centered modal + backdrop | Centered modal + backdrop |
| Game action confirm | Inline button replacement | Inline button replacement |
| Incoming event | Toast bottom-left | Banner between board and tabs |
| System status | Toast top-center | Toast top-center |
| Info notification | Toast bottom-left, auto-dismiss | Toast bottom-left, auto-dismiss |
| Context menu | Popover anchored to trigger | Bottom drawer |
| Account/nav menu | Dropdown from avatar/icon | Bottom drawer |
| Notifications list | Dropdown panel from bell | Bottom drawer |
| Simple form | Inline expansion | Inline expansion |
| Complex creation | Full page within nav shell | Full page within nav shell |
| Piece promotion | On-board selector | On-board selector |
| Search | Dropdown from search icon | Full page search |
| Loading | Skeleton screens | Skeleton screens |
| Reconnecting | Persistent top banner | Persistent top banner |
| Share/export | Popover with copy actions | Bottom drawer |

---

## Empty States

Every empty state: one line of explanation + one action if possible. No illustrations. No emoji.

- **No games yet:** "You haven't played yet. [Play your first game →]"
- **No friends online:** "No friends online. [Invite a friend to play →]"
- **No challenges:** "No challenges right now. Create one above or wait."
- **Leaderboard (new player):** "Play 30 rated games to qualify for the leaderboard."

## Error States

- **Move rejected:** Piece animates back. No text needed.
- **Network error:** Inline where content would be: "Something went wrong. [Retry]"
- **404:** Within nav shell: "Page not found. [Go Home →]"
- **Game not found:** "This game no longer exists. [Go Home →]"

## Onboarding (First-Time User Experience)

**No tutorial modals. No wizards. Product teaches by doing.**

- First visit: Play as Guest available immediately. Sign up present but not blocking. "Learn Co Tu Lenh" link for beginners. Live game showing on right to communicate platform is alive.
- First game: One-line hint below board ("Click a piece to see its moves"). Disappears after first move, never returns (localStorage).
- Post-registration: Dismissible banner "Welcome! [Learn the Rules] [Play vs Computer]". Gone after dismissal or 3 games.

## Keyboard Shortcuts

**Global:** 1-5 for nav sections. `?` for shortcut overlay.
**In-Game:** ← → move navigation. Home/End jump to first/last. `z` zen mode. `f` flip board. Esc cancel/dismiss. Space accept incoming offer.

## Micro-Interactions & Feedback

**Piece movement:** Drag at 60fps, 0.85 opacity. Valid squares: dot indicator. Drop valid: snap 100ms. Drop invalid: animate back 150ms. Last move: highlighted squares. Check: danger highlight on king.
**Buttons:** Hover: fill 100ms. Active: darker, instant. Focus: 2px accent outline. Disabled: 40% opacity.
**Clock:** Running: subtle pulse. <30s: danger text. <10s: danger background.
**Rating change:** Number counts up/down over 500ms. Green gain, red loss.
**Tab/page switches:** Instant swap. No animations.

## Sound Design

- Move: clean mechanical click
- Capture: heavier variant
- Game start: single subtle tone
- Game end: two-note resolving chord
- Low time (<10s): subtle tick each second
- Notification: single soft ping
- **No music. No ambient. No fanfare.** Tool, not game.

## Color System

**Team colors:**
- Red: hsl(0, 70%, 50%) — dark mode: hsl(0, 65%, 60%)
- Blue: hsl(210, 70%, 50%) — dark mode: hsl(210, 65%, 60%)
- Used as: 4px left border on player bars, 10% opacity clock tint

**Semantic colors:**
- Rating gain / win / correct: success (green)
- Rating loss / loss / wrong: danger (red)
- Neutral / draw: text-secondary (muted)
- Provisional rating: text-secondary + "?"

## List & Table Patterns

| Context | Pattern |
|---|---|
| Recent games (home) | Show 5 + "Show more" |
| Game history (profile) | Infinite scroll |
| Leaderboard | Paginated (20/page) |
| Open challenges (lobby) | Live-updating, no pagination |
| Tournament standings | Paginated |
| Search results | Paginated (URL-shareable) |

**Table design:** Header in text-secondary, uppercase, size-xs. No alternating row colors. Row hover: surface-raised. Click navigates. Only border between header and body. Mobile: collapse to essential columns.

## Dark Mode

```
LIGHT:                          DARK:
surface:        #ffffff         surface:        #1a1a1a
surface-raised: #f5f5f5         surface-raised: #242424
border:         #e0e0e0         border:         #333333
text-primary:   #1a1a1a         text-primary:   #e0e0e0
text-secondary: #666666         text-secondary: #888888
```

Board themes have separate dark mode variants. Pieces stay the same. Charts use accent line on surface bg. Skeleton screens slightly lighter than surface in dark.

## Design System Tokens

```
SPACING:
  xs: 4px    sm: 8px    md: 16px    lg: 24px    xl: 32px

TYPOGRAPHY:
  font-family: system sans-serif or monospace (pick one)
  xs: 11px  sm: 13px  md: 15px  lg: 18px  xl: 24px  xxl: 32px
  weight: 400 (normal), 500 (medium), 700 (bold)

BORDERS:
  radius: 0px (sharp corners everywhere)
  width: 1px solid {border}
  NO shadows. NO gradients. NO rounded corners.

BREAKPOINTS:
  mobile:  < 640px
  tablet:  640-1024px
  desktop: > 1024px

ANIMATION:
  duration: 100-150ms max
  easing: ease-out
  Piece movement: 150ms
  NO bounces, springs, or playful animations
  Respect prefers-reduced-motion
```

## Responsive Behavior Summary

| Component | Desktop (>1024px) | Tablet (640-1024px) | Mobile (<640px) |
|---|---|---|---|
| Navigation | Left sidebar, collapsible | Left sidebar, collapsed icons | Bottom tab bar |
| Game: board | Center column, max height | Center column, max height | Full width square |
| Game: right panel | Fixed right 280-320px | Fixed right 240px | Below board, scrollable |
| Game: player bars | Full info above/below board | Full info | Compressed single line |
| Home: layout | Two columns (60/40) | Two columns (55/45) | Single column stacked |
| Home: live panel | Right column, visible | Right column, condensed | Hidden |
| Profile: graph | Full width, tall | Full width, medium | Full width, compact |
| Popovers | Anchored dropdown | Anchored dropdown | Bottom drawer |
| Toasts | Bottom-left floating | Bottom-left floating | Banner |
| Modals | Centered, max 480px | Centered, max 480px | Near full screen, 16px margin |

## URL Structure

```
/                     → Home
/play                 → Lobby
/play/ai              → vs Computer
/game/{id}            → Live or replay
/game/{id}/analysis   → Analysis (future)
/learn                → Learn hub
/learn/lessons/{id}   → Lesson
/learn/puzzles        → Puzzles
/tournament           → Tournament list (future)
/tournament/{id}      → Tournament (future)
/watch                → Live TV (future)
/@/{username}         → Profile
/@/{username}/games   → Game history
/settings             → Settings
/analysis             → Analysis board (future)
/editor               → Board editor (future)
```

Back button always works. Every game has a permanent shareable URL.

## Social Sharing / Open Graph

Game links shared on Discord/Telegram/Facebook show: title "player1 vs player2", description with result + time control, board image (final position as PNG). Profile links show: name, rating, game count.

## Accessibility Baseline (Day One)

- All elements keyboard-focusable with visible 2px accent outline
- All buttons/icons have aria-label
- Color never sole information carrier (always paired with text/icon)
- Contrast: 4.5:1 normal text, 3:1 large text (WCAG AA)
- Screen reader announces: "Your turn", "Game over", move notation
- prefers-reduced-motion: disable all animations

## Copy / Voice & Tone

Write like a developer, not a marketer. No exclamation marks. No emoji in system text. Shortest possible sentence. Vietnamese and English both follow: direct, factual, respectful.

| Context | Good | Bad |
|---|---|---|
| Win | "You win" | "Congratulations!" |
| Loss | "You lose" | "Better luck next time!" |
| Error | "Something went wrong. Retry." | "Oops! We hit a snag." |
| Empty | "No games yet." | "It's lonely here!" |

## Performance Perception

- Optimistic UI for moves (show immediately, sync after)
- Skeleton screens (<100ms to first shape)
- WebSocket-driven lobby (no polling)
- Preload board assets during idle
- Route prefetch on nav hover
- Tab content always in memory (instant swap)

---

## Gap Analysis: Current Implementation vs Plan

### Current App State (as of 2026-03-06)

**Tech Stack:** Svelte 5 + SvelteKit 2, Supabase (PostgreSQL + Realtime WebSocket), Tailwind CSS 4, bits-ui, Vercel hosting.

**Monorepo Structure:**
- `apps/cotulenh/app/` — Main SvelteKit application
- `packages/cotulenh/core/` — Game rules engine
- `packages/cotulenh/board/` — Board visualization
- `packages/cotulenh/learn/` — Curriculum data & lessons
- `packages/cotulenh/common/` — Shared utilities

**Existing Routes:**
```
/                          → Home (Friends + Activity tabs)
/auth/login|register|...   → Authentication
/play                      → Play Lobby (desktop + mobile)
/play/online               → Online game hub (invitations, friends)
/play/online/[gameId]      → Active game screen
/play/online/invite/[code] → Accept invite link
/play/practice             → Single-player practice
/learn                     → Learning curriculum dashboard
/learn/[subjectId]/...     → Interactive lessons
/puzzles                   → Puzzle library (3 hardcoded)
/board-editor              → Board position editor
/user/profile              → Edit profile + stats
/user/profile/[username]   → Public profile view
/user/settings             → Account settings
/user/friends              → Friends management
/user/history              → Game history
/user/history/[gameId]     → Game replay
/report-issue              → Bug report form
```

### Feature Match Matrix

| Plan Feature | Status | Notes |
|---|---|---|
| #1 Quick Pairing / Lobby | **NOT BUILT** | No matchmaking. Must invite a friend or share link. |
| #2 Play with a Friend | **DONE** | Shareable invite links + direct friend invites |
| #3 Play vs Computer | **NOT BUILT** | No AI. Only practice mode (self-play). |
| #4 Correspondence | **NOT BUILT** | No async play |
| #5 Rematch | **DONE** | Post-game rematch requests |
| #6 Time Controls | **PARTIAL** | 5 presets + custom. No correspondence time controls. |
| #7 Clock Systems | **PARTIAL** | Fischer increment exists. No Bronstein/Simple delay. |
| #8 Premoves | **NOT BUILT** | |
| #9 Move Confirmation | **DONE** | Toggleable in settings |
| #10 Draw/Resign/Takeback | **DONE** | All implemented |
| #11 Zen Mode | **NOT BUILT** | |
| #12 In-Game Chat | **NOT BUILT** | |
| #13 Spectator Mode | **NOT BUILT** | |
| #14 Interactive Lessons | **DONE** | Full curriculum with progress tracking |
| #15 Puzzles Enhanced | **BASIC** | 3 hardcoded puzzles, no rating system |
| #16-23 Learn (advanced) | **NOT BUILT** | Dashboard, modes, drills, studies, coach, classes, learn from mistakes |
| #24-29 Tournaments | **NOT BUILT** | |
| #30-36 Watch/Community | **NOT BUILT** | |
| #37 Analysis Board | **NOT BUILT** | Game replay exists but no branching/analysis |
| #38-42 Analysis (advanced) | **NOT BUILT** | Engine-dependent |
| #43 Glicko-2 Ratings | **NOT BUILT** | No rating system at all |
| #44 Leaderboards | **NOT BUILT** | |
| #45 Game Insights | **NOT BUILT** | |
| #46 Friends/Following | **DONE** | Friend system with online presence |
| #47 Direct Messaging | **NOT BUILT** | |
| #48 User Notes | **NOT BUILT** | |
| #49 Block Users | **NOT BUILT** | |
| #50 Flairs/Cosmetics | **NOT BUILT** | |
| #51 Activity Heatmap | **NOT BUILT** | |
| #52 Import Game | **NOT BUILT** | |
| #53 Advanced Game Search | **NOT BUILT** | |
| #54 Export/Download | **NOT BUILT** | |
| #55 Open Database | **NOT BUILT** | |
| #56 API | **NOT BUILT** | |
| #57 Embed Widgets | **NOT BUILT** | |
| #58 Board Themes | **PARTIAL** | 4 military themes (modern-warfare, desert-ops, forest, classic). Not board-specific. |
| #59 Piece Sets | **NOT BUILT** | Single piece set |
| #60 Sound Packs | **PARTIAL** | Sounds exist with volume control. Single sound set. |
| #61 Game Behavior | **PARTIAL** | Move confirm, sounds, deploy options. Missing: premove toggle, takeback policy. |
| #62 Zen Mode Toggle | **NOT BUILT** | |
| #63 Kid Mode | **NOT BUILT** | |
| #64 Language Support | **DONE** | Vietnamese + English |
| #65-68 Fair Play | **NOT BUILT** | No anti-cheat, no report system, no rating refunds |

### UX Architecture Gap Analysis

| Plan Element | Current State | Gap |
|---|---|---|
| **Left sidebar nav (IDE-style)** | 48px icon sidebar exists with: Home, Play, Puzzles, Board Editor, Friends | **Close match.** Needs reorganization: Learn missing from nav, Puzzles should be under Learn, nav items should match plan (Home, Play, Learn, Profile, Settings). |
| **Mobile: Bottom tab bar** | Hamburger menu (top-left dropdown) | **MAJOR GAP.** Plan calls for persistent bottom tab bar. Current uses hamburger — poor discoverability, no muscle memory. |
| **Game screen: Board + Right panel with tabs** | Board + multiple side panels (GameInfo, MoveHistory, GameControls as separate components) | **MEDIUM GAP.** Components exist but not unified into a single tabbed right panel. Needs consolidation into [Moves][Chat] tabs pattern. |
| **Home: Command center dashboard** | CommandCenter with Friends/Activity tabs only | **LARGE GAP.** Missing: Quick Action buttons (2x2 grid), Daily Puzzle, Recent Games list, Online Friends sidebar, Leaderboard preview, Live mini board. |
| **Post-game: Result overlay on board** | GameResultBanner as separate component | **SMALL GAP.** Needs to overlay on board rather than appear as separate banner. |
| **Inline confirmations** | AlertDialog modals for some confirmations | **MEDIUM GAP.** Plan says inline button replacement (button row swaps to Yes/No). Current uses modal dialogs. |
| **Toast positioning** | svelte-sonner (toast library exists) | **SMALL GAP.** Verify bottom-left for events, top-center for system. May need configuration. |
| **Skeleton loading** | Not implemented | **MEDIUM GAP.** No loading states defined. Plan calls for skeleton screens everywhere. |
| **Design tokens / Visual vibe** | Military themed (modern-warfare, desert-ops, forest, classic). Dark backgrounds, cyan accent. | **PHILOSOPHICAL GAP.** Plan calls for utilitarian Lichess-style with sharp corners, no shadows, monochrome + one accent. Current is more "military game" aesthetic. Needs discussion: keep military vibe or go utilitarian? |
| **Border radius** | bits-ui defaults (likely rounded) | **MEDIUM GAP.** Plan says 0px everywhere. |
| **URL structure** | `/user/profile/[username]`, `/user/friends`, `/user/history`, `/play/online/[gameId]` | **MEDIUM GAP.** Plan: `/@/username`, `/game/{id}`, cleaner paths. Changing URLs is a breaking change — needs redirects. |
| **Empty states** | Unknown — likely basic or missing | **MEDIUM GAP.** Plan defines specific empty state text + CTAs for every screen. |
| **Keyboard shortcuts** | ShortcutsDialog exists | **SMALL GAP.** Needs audit against plan's shortcut list. |
| **Social sharing / Open Graph** | Unknown | **MEDIUM GAP.** Plan calls for dynamic OG tags per game URL with board image. |
| **Accessibility baseline** | Some ARIA labels, screen reader support noted | **SMALL GAP.** Needs audit against plan's WCAG AA requirements. |

### The 5 Biggest Gaps (Priority Order)

**1. No matchmaking / quick pairing (#1)**
Can't find a random opponent. Platform requires pre-existing social connections to play. This is the single biggest blocker to growth.

**2. No rating system (#43 + #44)**
No Glicko-2 ratings. No matchmaking quality. No progression feeling. No leaderboards. No competitive motivation to return.

**3. Mobile navigation: hamburger → bottom tabs**
Current hamburger menu hides all features behind a tap. Plan calls for persistent bottom tab bar — the standard for gaming/utility apps. Major discoverability and muscle memory impact.

**4. Home page is barren**
Current home for logged-in users: Friends + Activity tabs. Plan: Quick Play buttons (2x2), Daily Puzzle, Recent Games, Online Friends, Leaderboard top 5, Live mini board. The home should answer "what can I do right now?" instantly.

**5. Game screen UX consolidation**
Current game screen has multiple separate side panels (GameInfo, MoveHistory, GameControls). Plan calls for a unified right panel with text tabs ([Moves][Chat]) — consistent, extensible, and matching the Lichess pattern.

**Note:** Play vs Computer / AI (#3) is intentionally excluded from MVP — requires engine development which is a separate major effort.

### What's Strong Today (Keep & Build On)

- **Real-time multiplayer infrastructure** — WebSocket via Supabase works well
- **Friend system with presence** — solid social foundation
- **Game invite flow** — shareable links + friend invites are clean
- **Learning curriculum** — full interactive lesson system with progress
- **Left sidebar nav** — already close to plan's IDE-style pattern
- **Settings sync** — localStorage + Supabase sync pattern is good
- **i18n system** — EN/VI built in from the start
- **Responsive layouts** — desktop + mobile variants exist for key screens
- **Game session management** — clock, moves, state transitions are solid

---

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Core Gameplay Loop (Play)** — 13 ideas (#1-#13)
- Matchmaking, time controls, game management, social play
- Pattern: The play loop must work for a small community — matchmaking + friend invites + async options

**Theme 2: Learning & Progression** — 10 ideas (#14-#23)
- Lessons, puzzles, practice, studies, coaching
- Pattern: Foundation exists. Enhancement path clear — puzzles need rating, lessons need expansion

**Theme 3: Competitive & Community** — 13 ideas (#24-#36)
- Tournaments, spectating, teams, content creation
- Pattern: All community features grow from critical mass. Arena tournaments first (works with 4-5 players).

**Theme 4: Analysis & Tools** — 12 ideas (#37-#42, #52-#57)
- Analysis board, import/export, API, open database
- Pattern: Most are engine-dependent or data-dependent. Opening Explorer is the exception — builds from game data alone.

**Theme 5: Identity & Progression** — 13 ideas (#43-#51, #58-#64)
- Ratings, profiles, cosmetics, settings, social
- Pattern: Rating system is the keystone — matchmaking, leaderboards, and progression all depend on it.

**Theme 6: Platform Integrity** — 4 ideas (#65-#68)
- Anti-cheat, reports, fair play
- Pattern: Needs engine for cheat detection. Report system can start earlier.

**Cross-Cutting: UX Architecture**
- 10 screen-by-screen specifications with responsive behavior
- 9-rule overlay/interaction strategy
- Design tokens, accessibility baseline, performance perception
- Pattern: Architecture is additive — every future feature maps to an existing container.

### Prioritization Results

**Top Priority (Immediate — blocks platform growth):**

1. **Matchmaking / Quick Pairing (#1)** — Without this, the platform can't grow beyond existing friend networks
2. **Glicko-2 Rating System + Leaderboards (#43, #44)** — Progression, matchmaking quality, competitive motivation
3. **Mobile Bottom Tab Bar** — Current hamburger UX is a discoverability killer
4. **Home Dashboard Redesign** — First screen users see. Must answer "what can I do?" instantly
5. **Game Screen: Unified Right Panel with Tabs** — Consolidate existing components into extensible pattern

**Quick Wins (low effort, high polish):**

- Zen Mode (#11) — toggle visibility of opponent info
- Premoves (#8) — queue moves during opponent turn
- In-Game Chat (#12) — tab in the right panel
- Reorganize nav items — move Learn into sidebar, move Puzzles under Learn
- Empty states — add actionable text + CTAs to all empty screens

**Breakthrough Concepts (longer term, high value):**

- Opening Explorer (#39) — builds from game data alone, no engine needed. Unique to Co Tu Lenh.
- Arena Tournaments (#24) — works with small community, creates rhythm
- Correspondence (#4) — solves "nobody online" without needing AI

### Action Planning

**Priority 1: Matchmaking**
- **Next Steps:** Design matchmaking queue (rating-based + time control). Supabase realtime channel for lobby presence. "Find Opponent" button on Home + Play screens.
- **Resources:** Backend queue logic, realtime subscription, lobby UI
- **Success Indicator:** A solo visitor can find a game within 60 seconds when other players are online

**Priority 2: Rating System**
- **Next Steps:** Implement Glicko-2 calculation. Store ratings per time control in profiles. Calculate after each rated game. Display on profile + leaderboard.
- **Resources:** Glicko-2 library or implementation, DB schema changes, leaderboard page
- **Success Indicator:** Every player has a visible rating that changes after each game

**Priority 3: Mobile Bottom Nav**
- **Next Steps:** Replace hamburger with fixed bottom tab bar. 5 icons: Home, Play, Learn, Profile, Settings. "More" overflow when future sections added.
- **Resources:** Layout refactor, responsive breakpoint changes
- **Success Indicator:** All primary sections reachable with one tap on mobile

**Priority 4: Home Dashboard**
- **Next Steps:** Replace Friends/Activity tabs with command center layout. Add: Quick Action 2x2 grid, Recent Games list, Online Friends sidebar, Leaderboard top 5.
- **Resources:** New dashboard components, data loading for recent games + leaderboard
- **Success Indicator:** Logged-in user sees play options + community activity immediately

**Priority 5: Game Screen Consolidation**
- **Next Steps:** Unify GameInfo, MoveHistory, GameControls into single right panel with [Moves][Chat] text tabs. Lock board-center layout. Add tab extension point.
- **Resources:** Component refactor, tab system
- **Success Indicator:** Game screen matches plan layout. Adding future tabs (Spectators, Engine) requires no layout changes.

---

## Session Summary and Insights

**Key Achievements:**
- Generated 68 concrete feature ideas across 9 branches mapped from Lichess's complete platform
- Prioritized features into MVP / Soon After / Future tiers
- Designed a complete ground-up UX architecture with future-proof navigation shell, screen-by-screen specifications for 10 screens, responsive behavior for all breakpoints, overlay/interaction strategy, design tokens, and comprehensive design agent guidelines
- Performed full gap analysis comparing the plan against current implementation
- Identified the 5 biggest gaps blocking platform growth

**Session Reflections:**
- The Lichess model maps remarkably well to Co Tu Lenh as a platform — the core loop (play, learn, compete) is universal
- Co Tu Lenh's unique mechanics (fog of war, terrain, command cards) create novel design challenges especially around spectating and analysis
- The IDE-style navigation from the previous brainstorm session was validated and refined into a complete responsive system
- Small community considerations drove key decisions: arena > swiss for tournaments, friends-online visibility, guest play for zero friction
- Current implementation has a strong foundation (real-time multiplayer, friend system, learning curriculum, invite flow) but is missing critical growth features (matchmaking, AI, ratings)
- The existing 48px left sidebar nav is already close to the plan — the biggest UX gap is mobile navigation (hamburger → bottom tab bar)
- A philosophical design decision remains open: keep the military theme aesthetic or shift to utilitarian Lichess-style
