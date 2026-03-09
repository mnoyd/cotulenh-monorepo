# Play Screen & Multiplayer Enhancement Design

**Date:** 2026-03-05
**Branch:** redesign-uiux-app

## Overview

Enhance the play screen with a proper mode selection lobby, real multiplayer experience features (move confirmation, takebacks), and a clean practice mode without clocks.

## Routes

| Route                   | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `/play`                 | Lobby — mode selection + time control grid                            |
| `/play/practice`        | Practice board, no clock, play both sides                             |
| `/play/online`          | Invitation hub (existing, enhanced to accept time control from lobby) |
| `/play/online/[gameId]` | Active online game (existing, enhanced with takebacks)                |

## Lobby Page (`/play`)

The `/play` route becomes a mode selection screen. No board visible — just a clean lobby.

### Layout (Desktop)

Two side-by-side sections:

```
┌──────────────────────────────────────────────┐
│  PLAY                                        │
│                                              │
│  ┌─────────────────┐  ┌────────────────────┐ │
│  │  PLAY ONLINE     │  │  PRACTICE          │ │
│  │                  │  │                    │ │
│  │  ┌─────┐ ┌─────┐│  │  Play both sides.  │ │
│  │  │ 1+0 │ │ 2+1 ││  │  No clock, no      │ │
│  │  ├─────┤ ├─────┤│  │  pressure. Explore  │ │
│  │  │ 3+0 │ │ 3+2 ││  │  moves freely.     │ │
│  │  ├─────┤ ├─────┤│  │                    │ │
│  │  │ 5+0 │ │ 5+3 ││  │  [Start Practice]  │ │
│  │  ├─────┤ ├─────┤│  │                    │ │
│  │  │10+0 │ │15+10││  └────────────────────┘ │
│  │  ├─────┤ ├─────┤│                         │
│  │  │30+0 │ │Cust.││                         │
│  │  └─────┘ └─────┘│                         │
│  │                  │                         │
│  │  [Create Game]   │                         │
│  └─────────────────┘                         │
└──────────────────────────────────────────────┘
```

### Layout (Mobile)

Sections stacked vertically — Online on top, Practice below.

### Time Control Grid

- Flat 3-column grid of presets, no category labels
- Presets: 1+0, 2+1, 3+0, 3+2, 5+0, 5+3, 10+0, 15+10, 30+0
- "Custom" row expands to show minute (1–60) and increment (0–30) inputs
- Monospace text on flat surface, matching existing redesign aesthetic
- Selected preset: accent color fill. Unselected: subtle border/tint
- Validation reuses existing `validateGameConfig()`

### Navigation

- Select time control + "Create Game" → `/play/online?tc=5+3` (or `?minutes=10&increment=5` for custom)
- "Start Practice" → `/play/practice`
- The online hub reads time control from query params and pre-fills it

## Practice Mode (`/play/practice`)

- Current `/play` board behavior relocated to this route
- **No clock at all** — purely relaxed sandbox
- Actions preserved: reset, undo, flip board, share FEN
- No changes to game engine or board interaction
- Uses existing `GameSession` without clock initialization

## Move Confirmation (Online Games)

### Setting

- Toggle in user settings page, default **off**, persisted to local storage
- Applies to all online games when enabled

### Behavior

- When enabled: after making a move, a **confirm/cancel bar** appears below the board
- The piece is previewed at the destination square (dimmed/ghosted) until confirmed
- "Confirm" (accent color) sends the move via Supabase channel
- "Cancel" (muted) returns the piece to its original position
- The existing `MoveConfirmationPanel` component may be enhanced or replaced to follow this pattern

### Scope

- Online games only
- Practice mode does not need confirmation (moves are freely undoable)

## Takebacks (Online Games)

### Request Flow

1. Player taps "Takeback" button in the game panel
2. A takeback request message is sent via the Supabase real-time channel
3. Opponent sees a notification bar: "Opponent requests takeback — Accept / Decline"
4. If accepted: the last move is undone for both players, clocks adjust
5. If declined: notification dismissed, play continues

### Rules

- Only one takeback request per move (no spam)
- Auto-declines if opponent has already made their next move
- Available in all games (can be restricted to casual-only when rated games are added)

### Implementation

- New message type in `lib/game/messages.ts` (alongside existing draw offer messages)
- Reuses the notification bar UI pattern from draw offers
- Server-side: new channel message type, similar to draw offer handling
- Game state rollback: call existing undo logic in `GameSession`

## Styling

All new UI follows the existing redesign aesthetic:

- Flat surfaces, no decorative elements
- Monospace typography (13px base)
- Dense spacing
- Accent color for interactive elements
- Consistent with `command-center.css` design tokens
- Dark/light theme support via CSS custom properties

## What's NOT In Scope

- Matchmaking / random opponent pairing (future, needs player base)
- Pre-moves (future enhancement)
- Post-game analysis (future enhancement)
- Rating system (future enhancement)
- AI opponent (future enhancement)
