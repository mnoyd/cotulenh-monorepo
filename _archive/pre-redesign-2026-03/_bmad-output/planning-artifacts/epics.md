---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - ux-design-specification.md
---

# cotulenh-monorepo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the CoTuLenh ground-up redesign, decomposing requirements from the UX Design Specification into implementable stories. Requirements are scoped to genuinely NEW work — features not yet implemented in the current codebase.

### Design Invariant: Board Is Sacred

All screens that display a board use the `BoardWrapper` component. The board must remain fully visible, unobstructed, and non-scrollable on all screen sizes. No modal, drawer, toast, or panel may overlap the board region. This is a component-level guarantee, not a per-story responsibility.

## Requirements Inventory

### Functional Requirements

- **FR1:** Quick Play matchmaking — one-tap rated game with rating-based opponent matching (±100 expanding to ±300)
- **FR2:** Open challenge system — create/accept public challenges with custom time controls
- **FR3:** Lobby page — browse available open challenges, filter by time control and rating range
- **FR4:** Glicko-2 rating calculation — per-time-control ratings (Rapid, Classical), updated after each rated game
- **FR5:** Provisional rating status — flagged until 30 rated games completed, wider rating deviation
- **FR6:** Rated vs casual game selection — toggle on game creation, affects rating calculation
- **FR7:** Rating display on profiles — show current rating, RD, game count per time control
- **FR8:** Post-game rating change animation — show old → new rating with delta after rated games
- **FR9:** Leaderboard page — top players by time control, searchable, shows rating + trend
- **FR10:** In-game chat panel — real-time messaging in the game screen Chat tab, with mute option
- **FR11:** Home dashboard redesign — board-centric layout with Quick Play button, active games, recent games
- **FR12:** Mobile bottom tab bar — 56px fixed bottom navigation (Home, Play, Learn, Social, Profile) for <1024px
- **FR13:** Tabbed game right panel — single panel with [Moves][Chat] tabs replacing multi-panel layout
- **FR14:** Inline confirmation for game actions — thumb-zone confirmations for resign, draw offer, takeback
- **FR15:** Toast notification repositioning — bottom-left placement, outside board region
- **FR16:** Profile page rating cards — per-time-control rating display with game count and trend
- **FR17:** Post-game rating change display — rating delta shown in post-game summary

### Non-Functional Requirements

- **NFR1:** Board must be fully visible and unobstructed on all screen sizes (BoardWrapper contract)
- **NFR2:** Responsive breakpoints at 640px (mobile/tablet) and 1024px (tablet/desktop)
- **NFR3:** Navigation: collapsed 48px sidebar on desktop, 56px bottom tab bar on mobile/tablet
- **NFR4:** 0px border radius, no shadows, no gradients, system fonts only (design tokens)
- **NFR5:** Matchmaking queue response time <3s for 95th percentile
- **NFR6:** Rating calculation must be atomic with game completion (no partial updates)
- **NFR7:** Chat messages delivered via Supabase Realtime with <500ms latency

### Additional Requirements

- All overlays follow the 9-rule overlay strategy from UX spec (modals only for irreversible actions)
- Glicko-2 implementation must handle provisional players, rating floors, and deviation decay
- Matchmaking must expand search bracket over time if no match found
- Leaderboard must update in near-real-time after game completion

### FR Coverage Map

- FR1: Epic 3 — Quick Play matchmaking
- FR2: Epic 3 — Open challenge system
- FR3: Epic 3 — Lobby page
- FR4: Epic 2 — Glicko-2 rating calculation
- FR5: Epic 2 — Provisional rating status
- FR6: Epic 2 — Rated vs casual toggle
- FR7: Epic 2 — Rating display on profiles
- FR8: Epic 2 — Post-game rating change animation
- FR9: Epic 4 — Leaderboard page
- FR10: Epic 4 — In-game chat panel
- FR11: Epic 1 — Home dashboard redesign
- FR12: Epic 1 — Mobile bottom tab bar
- FR13: Epic 1 — Tabbed game right panel
- FR14: Epic 1 — Inline confirmations
- FR15: Epic 1 — Toast repositioning
- FR16: Epic 2 — Profile page rating cards
- FR17: Epic 2 — Post-game rating change display

## Epic List

### Epic 1: UI Shell Redesign
Users get the new Lichess-inspired navigation and board-centric game layout across all devices. BoardWrapper guarantees the board is always fully visible and unobstructed. Dashboard uses placeholder content until matchmaking and ratings land in later epics.
**FRs covered:** FR11, FR12, FR13, FR14, FR15

### Epic 2: Rating System
Users earn Glicko-2 ratings per time control, see them on profile rating cards, and watch their rating change animate after each rated game. Existing friend games can be played as rated or casual.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR16, FR17

### Epic 3: Matchmaking & Lobby
Users find opponents instantly via Quick Play or browse and create open challenges in a lobby. The home dashboard gets its real content — Quick Play button, active games list.
**FRs covered:** FR1, FR2, FR3

### Epic 4: Social Features
Users chat during games via the Chat tab and compete on the leaderboard page ranked by time control.
**FRs covered:** FR9, FR10

---

## Epic 1: UI Shell Redesign

Users get the new Lichess-inspired navigation and board-centric game layout across all devices. BoardWrapper guarantees the board is always fully visible and unobstructed. Dashboard uses placeholder content until matchmaking and ratings land in later epics.

### Story 1.1: Responsive Navigation Shell

As a **player**,
I want a clean sidebar on desktop and bottom tab bar on mobile,
So that I can navigate the app quickly without chrome stealing focus from the board.

**Acceptance Criteria:**

**Given** viewport width ≥1024px
**When** the app renders
**Then** a 48px collapsed icon sidebar appears on the left with icons for Home, Play, Learn, Social, Profile
**And** no bottom tab bar is rendered

**Given** viewport width <1024px
**When** the app renders
**Then** a 56px fixed bottom tab bar appears with icons for Home, Play, Learn, Social, Profile
**And** no sidebar is rendered

**Given** the old top navigation bar and hamburger menu
**When** this story is complete
**Then** they are removed entirely

**Given** any navigation icon is tapped/clicked
**When** the user interacts
**Then** they navigate to the corresponding route with the active icon visually highlighted

**Given** design tokens
**When** navigation renders
**Then** it uses 0px border radius, no shadows, no gradients, system fonts only

### Story 1.2: Home Dashboard Layout

As a **player**,
I want a board-centric home page that shows my game activity at a glance,
So that I can quickly resume games or start new ones.

**Acceptance Criteria:**

**Given** the user navigates to the home route
**When** the page renders on desktop (≥1024px)
**Then** a decorative board is displayed prominently with a right-side panel containing placeholder slots for: Quick Play button, active games list, recent games list

**Given** the user navigates to the home route
**When** the page renders on mobile (<1024px)
**Then** the board is displayed full-width with content slots stacked below it

**Given** no matchmaking or ratings features exist yet
**When** placeholder slots render
**Then** they show sensible empty states (e.g., "Quick Play — coming soon", "No active games")

**Given** the BoardWrapper component
**When** the home page renders on any screen size
**Then** the board is fully visible without scrolling or obstruction

### Story 1.3: Tabbed Game Right Panel

As a **player**,
I want the game screen to have a single tabbed panel with Moves and Chat tabs,
So that I have a clean, focused view during gameplay.

**Acceptance Criteria:**

**Given** the user is on the game screen on desktop (≥1024px)
**When** the page renders
**Then** the board occupies the left portion and a single right panel displays with [Moves] and [Chat] tabs

**Given** the user is on the game screen on mobile (<640px)
**When** the page renders
**Then** the board is full-width and the tabbed panel appears below it in a collapsible region

**Given** the [Moves] tab is selected
**When** the user views it
**Then** the move list is displayed (existing move list functionality)

**Given** the [Chat] tab is selected
**When** the user views it
**Then** a placeholder "Chat coming soon" message is shown (actual chat in Epic 4)

**Given** the BoardWrapper component
**When** the game screen renders on any screen size
**Then** the board is never overlapped or clipped by the tabbed panel

### Story 1.4: Inline Game Action Confirmations

As a **player**,
I want resign, draw offer, and takeback confirmations to appear inline rather than as modal dialogs,
So that the board stays visible and I can confirm actions quickly with my thumb on mobile.

**Acceptance Criteria:**

**Given** the user taps "Resign"
**When** the action is triggered
**Then** an inline confirmation replaces the button row (e.g., "Resign? ✓ ✗") within the game panel — no modal overlay appears

**Given** the user taps "Offer Draw"
**When** the action is triggered
**Then** an inline confirmation appears within the game panel

**Given** the user taps "Request Takeback"
**When** the action is triggered
**Then** an inline confirmation appears within the game panel

**Given** any inline confirmation is showing
**When** the user taps ✗ (cancel)
**Then** the original button row is restored

**Given** any inline confirmation is showing
**When** the user taps ✓ (confirm)
**Then** the action executes and the confirmation dismisses

**Given** the board
**When** any confirmation is active
**Then** the board remains fully visible and interactive — no overlay covers it

### Story 1.5: Toast Notification Repositioning

As a **player**,
I want toast notifications to appear in the bottom-left corner,
So that they never obstruct the board or game controls.

**Acceptance Criteria:**

**Given** a toast notification is triggered (e.g., "Draw offered", "Opponent disconnected")
**When** it renders
**Then** it appears at bottom-left of the viewport, outside the board's bounding box

**Given** multiple toasts fire in sequence
**When** they stack
**Then** they stack upward from bottom-left, never overlapping the board

**Given** the game screen on mobile
**When** a toast renders
**Then** it appears above the bottom tab bar and outside the board region

**Given** design tokens
**When** toasts render
**Then** they use 0px border radius, no shadows, system fonts

---

## Epic 2: Rating System

Users earn Glicko-2 ratings per time control, see them on profile rating cards, and watch their rating change animate after each rated game. Existing friend games can be played as rated or casual.

### Story 2.1: Glicko-2 Rating Engine

As a **player**,
I want my skill to be tracked with a Glicko-2 rating per time control,
So that I have a meaningful measure of my ability that improves as I play.

**Acceptance Criteria:**

**Given** no ratings table exists
**When** this story is deployed
**Then** a `player_ratings` table is created with columns: user_id, time_control (Rapid/Classical), rating, rating_deviation, volatility, game_count, is_provisional, updated_at

**Given** a rated game completes
**When** the result is recorded
**Then** a Supabase Edge Function calculates new Glicko-2 ratings for both players atomically with the game completion (NFR6)

**Given** a player with fewer than 30 rated games in a time control
**When** their rating is calculated
**Then** they are flagged as provisional (is_provisional=true) with wider rating deviation

**Given** a player with 30+ rated games
**When** their rating is calculated
**Then** is_provisional is set to false and standard Glicko-2 deviation decay applies

**Given** a new player with no rating record
**When** they complete their first rated game
**Then** a rating record is created with default values (rating=1500, RD=350, volatility=0.06)

**Given** RLS policies
**When** any user queries ratings
**Then** all ratings are publicly readable but only the system function can write/update them

### Story 2.2: Rated vs Casual Game Selection

As a **player**,
I want to choose whether a game is rated or casual when creating it,
So that I can play for fun without affecting my rating.

**Acceptance Criteria:**

**Given** the user creates a new game (friend challenge or future matchmaking)
**When** the game creation UI renders
**Then** a "Rated" / "Casual" toggle is displayed, defaulting to Rated

**Given** the user selects "Casual"
**When** the game completes
**Then** no rating calculation is triggered for either player

**Given** the user selects "Rated"
**When** the game completes
**Then** the Glicko-2 engine from Story 2.1 is invoked for both players

**Given** one player is provisional and one is established
**When** a rated game completes
**Then** both players' ratings are updated correctly per Glicko-2 rules

**Given** the game record in the database
**When** a game is created
**Then** it stores an `is_rated` boolean that is immutable after creation

### Story 2.3: Rating Display on Profiles

As a **player**,
I want to see my ratings per time control on my profile,
So that I can track my progress and see how I compare.

**Acceptance Criteria:**

**Given** a user navigates to any player's profile
**When** the profile renders
**Then** rating cards are displayed for each time control the player has played (Rapid, Classical)

**Given** a rating card
**When** it renders
**Then** it shows: current rating, rating deviation (as confidence indicator), total game count, and provisional badge if applicable

**Given** a player with no games in a time control
**When** their profile renders
**Then** no rating card is shown for that time control (not "Unrated" placeholder)

**Given** the profile page on mobile
**When** it renders
**Then** rating cards stack vertically and respect the viewport without horizontal scrolling

### Story 2.4: Post-Game Rating Change

As a **player**,
I want to see my rating change animated after a rated game,
So that I feel the impact of my win or loss immediately.

**Acceptance Criteria:**

**Given** a rated game completes
**When** the post-game summary renders
**Then** the player's old rating, new rating, and delta (e.g., +12 or -8) are displayed

**Given** a positive rating change
**When** the animation plays
**Then** the delta is shown in green with an upward indicator

**Given** a negative rating change
**When** the animation plays
**Then** the delta is shown in red with a downward indicator

**Given** a casual game completes
**When** the post-game summary renders
**Then** no rating change is displayed

**Given** the post-game summary
**When** it renders on any screen size
**Then** it does not obstruct the board (shown within the game panel, not as a modal overlay)

### Story 2.5: Backfill Initial Ratings

As a **returning player**,
I want my existing game history to count toward my initial rating,
So that I don't start at 1500 despite having played many games.

**Acceptance Criteria:**

**Given** the ratings system is deployed for the first time
**When** a one-time migration script runs
**Then** it processes all existing completed games chronologically and calculates Glicko-2 ratings as if they were rated

**Given** a player with existing game history
**When** the migration completes
**Then** their rating, RD, game count, and provisional status reflect their full history

**Given** a player with no completed games
**When** the migration completes
**Then** no rating record is created for them (they'll get one on their first rated game)

**Given** the migration
**When** it runs
**Then** it is idempotent — running it twice produces the same result

---

## Epic 3: Matchmaking & Lobby

Users find opponents instantly via Quick Play or browse and create open challenges in a lobby. The home dashboard gets its real content — Quick Play button, active games list.

### Story 3.1: Quick Play Matchmaking

As a **player**,
I want to tap one button and be matched with a similarly-rated opponent,
So that I can start playing immediately without setup.

**Acceptance Criteria:**

**Given** the user taps "Quick Play" (on home dashboard or play page)
**When** they enter the matchmaking queue
**Then** the system searches for opponents within ±100 rating points in the same time control

**Given** no opponent is found within ±100 after 10 seconds
**When** the search continues
**Then** the bracket expands progressively to ±200, then ±300

**Given** a match is found
**When** both players are paired
**Then** a new rated game is created automatically and both players are redirected to the game screen

**Given** the user is waiting in queue
**When** they see the matchmaking UI
**Then** a searching indicator shows elapsed time and current search bracket

**Given** the user wants to cancel
**When** they tap cancel during queue
**Then** they are removed from the queue immediately

**Given** matchmaking performance (NFR5)
**When** a match exists within bracket
**Then** pairing completes in <3 seconds at 95th percentile

### Story 3.2: Open Challenge System

As a **player**,
I want to create a public challenge with my preferred settings,
So that anyone can accept it and we start playing.

**Acceptance Criteria:**

**Given** the user navigates to the play page
**When** they choose "Create Challenge"
**Then** they can set time control (Rapid/Classical) and rated/casual toggle, then publish the challenge

**Given** a challenge is published
**When** it appears in the lobby
**Then** it shows the creator's username, rating, time control, and rated/casual status

**Given** another player views a challenge
**When** they tap "Accept"
**Then** a new game is created with the specified settings and both players are redirected to the game screen

**Given** the creator is waiting for an opponent
**When** the challenge is live
**Then** the creator sees a waiting state with option to cancel

**Given** the creator cancels
**When** they tap cancel
**Then** the challenge is removed from the lobby immediately

### Story 3.3: Lobby Page & Dashboard Content

As a **player**,
I want to browse available challenges and see my activity on the home dashboard,
So that I can find games and track what's happening at a glance.

**Acceptance Criteria:**

**Given** the user navigates to the play/lobby page
**When** the page renders
**Then** a list of open challenges is displayed, sorted by creation time

**Given** the lobby list
**When** the user interacts with filters
**Then** they can filter by time control (Rapid/Classical) and rating range

**Given** the lobby on mobile
**When** it renders
**Then** challenges display in a compact card format that fits the viewport

**Given** the home dashboard (from Epic 1 placeholders)
**When** matchmaking is available
**Then** the Quick Play button is functional, active games show real data, and recent games show completed game history

**Given** a challenge is accepted by someone else
**When** the lobby list is visible
**Then** the challenge disappears from the list in real-time via Supabase Realtime

---

## Epic 4: Social Features

Users chat during games via the Chat tab and compete on the leaderboard page ranked by time control.

### Story 4.1: In-Game Chat

As a **player**,
I want to send and receive messages during a game,
So that I can communicate with my opponent.

**Acceptance Criteria:**

**Given** the user is on the game screen and selects the [Chat] tab
**When** the tab renders
**Then** a message input field and message list are displayed (replacing the "coming soon" placeholder from Epic 1)

**Given** the user types a message and sends it
**When** the message is submitted
**Then** it appears in both players' chat panels in real-time via Supabase Realtime (NFR7: <500ms)

**Given** a `game_messages` table does not exist
**When** this story is deployed
**Then** a `game_messages` table is created with: id, game_id, user_id, content, created_at, with RLS policies scoping reads/writes to game participants

**Given** the user wants to mute chat
**When** they tap a mute toggle in the Chat tab
**Then** incoming messages are hidden and the input field is disabled (client-side only, no server state)

**Given** the game ends
**When** the post-game state is active
**Then** chat remains readable but the input is disabled

### Story 4.2: Leaderboard Page

As a **player**,
I want to see the top-ranked players by time control,
So that I can see where I stand and who the best players are.

**Acceptance Criteria:**

**Given** the user navigates to the leaderboard page
**When** the page renders
**Then** it shows a ranked list of top players for the default time control (Rapid), with columns: rank, username, rating, game count

**Given** the leaderboard
**When** the user switches time control tabs (Rapid / Classical)
**Then** the list updates to show rankings for the selected time control

**Given** the leaderboard
**When** the user searches by username
**Then** the list filters to show matching players with their rank

**Given** the user's own entry
**When** they appear on the leaderboard
**Then** their row is visually highlighted

**Given** the leaderboard on mobile
**When** it renders
**Then** the table is responsive — columns prioritize rank, username, and rating, hiding secondary data if needed

**Given** leaderboard data
**When** a rated game completes elsewhere
**Then** the leaderboard reflects updated rankings on next page load (near-real-time, not necessarily live)
