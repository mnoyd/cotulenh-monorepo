# Command Center UI Redesign — Full Visual Overhaul

## Overview

Complete visual overhaul of the CoTuLenh app. Lichess-inspired: stark, monochrome, dense, utilitarian. No decorative elements. Text-first UI. Every page redesigned from scratch.

## Visual Reference

**Primary inspiration: Lichess.org**

- Monochrome, high-contrast, dark
- Almost zero icons in content (sidebar only)
- Text links instead of buttons for most actions
- No card containers — content floats with thin dividers
- Tiny, dense typography
- Zero animation, instant interactions

## Architecture

**Slot-Based Layout Component.** Each page imports `CommandCenter.svelte` directly and passes center content + tab definitions via Svelte 5 snippets. Root layout provides only the 48px icon rail, mobile hamburger, and global dialogs.

## App Shell Grid

```
grid-template-columns: 48px 1fr 320px
```

```
+--------+-------------------------+------------+
|        |                         | Tab Bar    |
| Icon   |                         |------------|
| Rail   |    Center Area          |            |
| 48px   |    (flex: 1)            |   Right    |
|        |                         |   Panel    |
|        |                         |   320px    |
+--------+-------------------------+------------+
```

- **Left rail**: 48px, icon-only (VS Code activity bar)
- **Center area**: Flexible, board-dominant on game pages
- **Right panel**: 320px fixed, tab bar + scrollable content
- **Mobile**: Rail hidden (hamburger menu). Right panel hidden (toggle button → full-screen overlay)

## Left Icon Rail (48px)

Icons only. No text labels. Tooltips on hover.

- **Items**: Logo, Home, Play, Puzzles, Editor, Friends (auth), Settings (dialog), Feedback (dialog), User/Sign-in
- **Active**: 2px accent-colored left edge bar, no background fill
- **Hover**: icon color → accent
- **Size**: 40×40px touch targets, 20px icons

## Right Panel Tab System

- Plain text labels, monospace, uppercase, 0.7rem
- Active: 2px bottom accent underline + bright text
- Inactive: `text-secondary` color
- No backgrounds, borders, decoration, or animation
- Content scrolls independently

### Per-Page Tabs

| Page             | Tabs                                     |
| ---------------- | ---------------------------------------- |
| Home (logged in) | Friends, Activity                        |
| Home (anon)      | none                                     |
| Play (local)     | Moves, Game                              |
| Play (online)    | Moves, Game (chat at bottom of Game tab) |
| Online hub       | none (single panel content)              |
| Learn hub        | none                                     |
| Learn lesson     | Lesson, Hints                            |
| Board Editor     | Pieces, Setup                            |
| Puzzles          | Moves, Hints                             |
| User pages       | none                                     |

## Visual Design System

### Typography

- **Body**: 13px, `--font-ui` (Be Vietnam Pro)
- **Secondary text**: 12px, `--theme-text-secondary`
- **Section headers**: 12px, uppercase, monospace, letter-spacing 0.1em, `--theme-text-secondary`
- **Move notation**: 13px, monospace
- **Nav labels**: none (icon-only rail)
- **Tab labels**: 11px, uppercase, monospace
- **No headings larger than 16px** except page titles (18px max)

### Icons

- **Sidebar rail only** — icons for nav items
- **Content areas**: strip nearly all icons. Use text labels exclusively
- **Exceptions**: online status dot (●), close button (×)

### Buttons

**Lichess-minimal button hierarchy:**

- **Primary CTA**: One per page max. Colored background (accent/green), no border-radius, uppercase monospace text. Example: `[PLAY]`
- **Secondary actions**: Plain text links. No background, no border. Underline on hover. Example: `resign`, `draw offer`
- **Toggle groups**: Text labels separated by `•`. Active item is bright, inactive is dim. Example: `5+3 • 10+0 • 15+10`
- **Remove**: All `btn-game-*` classes, all box-shadows, all gradients, all rounded corners on buttons

### Surfaces & Containers

**No containers.** Content sits directly on page background.

- Sections separated by 1px `--theme-border` horizontal rules
- Section headers are uppercase monospace text above the rule
- No card backgrounds, no card borders, no elevation, no `border-radius: 12px`
- The right panel background (`--theme-bg-panel`) is the only visible surface distinction

### Spacing Scale

Tight and dense:

- **Section gap**: 1rem
- **Item gap**: 0.25rem
- **Inner padding**: 0.5rem
- **Page margin**: 0.75rem
- **Divider margin**: 0.75rem 0

### Color Rules

- **Background**: `--theme-bg-dark` (near-black)
- **Right panel**: `--theme-bg-panel` (slightly lighter)
- **Text primary**: `--theme-text-primary` (near-white)
- **Text secondary**: `--theme-text-secondary` (gray, most text)
- **Accent**: `--theme-primary` (cyan) — active indicators, primary CTAs, links
- **Success**: green — win indicators
- **Error**: red — loss indicators, resign
- **No hardcoded colors** — everything through CSS variables
- **Accent used sparingly**: only active states, primary CTA, links on hover

### Dialogs

Settings, Shortcuts, Feedback stay as modal dialogs. Restyle:

- Remove rounded corners (use 2px max)
- Flat background, 1px border
- Dense padding (0.75rem)
- No decorative headers — plain text title

## Page Designs

### Home Page (Logged In)

```
CENTER:
┌─────────────────────────────┐
│                             │
│       [    PLAY    ]        │
│                             │
│   5+3 • 10+0 • 15+10       │
│   custom                    │
│                             │
│─────────────────────────────│
│ RECENT GAMES                │
│ vs Minh    W  5+3    2m ago │
│ vs Linh    L  10+0   1h ago │
│ vs Tuan    D  15+10  3h ago │
└─────────────────────────────┘

RIGHT TABS: [Friends] [Activity]

FRIENDS tab:
─────────────────
Player1  ● idle
Player2  ● playing
Player3  ● idle

ACTIVITY tab:
─────────────────
No recent activity
```

- Giant PLAY button (only colored element)
- Time control quick-select as text toggles
- Recent games as flat text list with result/time
- No feature cards, no hero, no marketing

### Home Page (Anonymous)

```
CENTER:
┌─────────────────────────────┐
│ Cờ Tư Lệnh — Vietnamese    │
│ military strategy chess     │
│                             │
│       [    PLAY    ]        │
│       (local game)          │
│                             │
│ sign up to play online      │
│─────────────────────────────│
│ learn the game →            │
│ try the editor →            │
└─────────────────────────────┘
```

- One-line description
- Play button goes to local
- Sign-up text link
- A few navigation links. That's it
- No right panel tabs

### Play Page (Local)

```
CENTER:
┌─────────────────────────────┐
│                             │
│         ┌─────────┐         │
│         │         │         │
│         │  BOARD  │         │
│         │         │         │
│         └─────────┘         │
│  [confirm]  [cancel]        │
└─────────────────────────────┘

RIGHT TABS: [Moves] [Game]

MOVES tab:
─────────────────
1. I4-I6   i8-i6
2. E4-E6   e8-e6
3. C1-D3

GAME tab:
─────────────────
Red   05:00  ●
Blue  04:32
─────────────────
Turn: Red
Status: Playing
─────────────────
resign  draw  undo
new game
```

- Board dominates center area, aspect-ratio locked
- Move confirm/cancel as text links below board
- Moves tab: move list in algebraic notation
- Game tab: clocks, turn indicator, text-link actions

### Play Page (Online Game)

Same as local, but Game tab also has chat at the bottom:

```
GAME tab:
─────────────────
Red   05:00  ●
Blue  04:32
─────────────────
resign  draw offer
─────────────────
CHAT
user1: gg
user2: thx
[type message...]
```

### Online Play Hub

```
CENTER:
┌─────────────────────────────┐
│ FRIENDS ONLINE (3)          │
│ Player1  ● idle    invite   │
│ Player2  ● in game          │
│ Player3  ● idle    invite   │
│─────────────────────────────│
│ INVITATIONS (1)             │
│ from Player4  5+3   accept  │
│─────────────────────────────│
│ CREATE GAME                 │
│ time: 5+3 • 10+0 • custom  │
│ type: rated • casual        │
│ [create invite link]        │
└─────────────────────────────┘
```

- Flat text lists, divider-separated sections
- `invite` and `accept` as plain text links
- Time/type selection as text toggles
- No cards, no icons

### Puzzles Page

```
CENTER:
┌─────────────────────────────┐
│ PUZZLES                     │
│─────────────────────────────│
│ #1  Commander Capture  Easy │
│ Red to move. Capture the    │
│ blue commander.        play │
│─────────────────────────────│
│ #2  Combined Arms    Medium │
│ Must win in 2 moves.   play │
│─────────────────────────────│
│ #3  Less vs More       Hard │
│ Must win in 3 moves.   play │
└─────────────────────────────┘

RIGHT TABS: [Moves] [Hints]
(populated when a puzzle is active)
```

- No cards, no rounded badges
- Difficulty as plain text (color-coded: green/yellow/red)
- `play` as text link
- Hint behind `show hint` text toggle (like `<details>`)

### Board Editor

```
CENTER:
┌─────────────────────────────┐
│         ┌─────────┐         │
│         │         │         │
│         │  BOARD  │         │
│         │ (edit)  │         │
│         │         │         │
│         └─────────┘         │
│  clear  export  share       │
└─────────────────────────────┘

RIGHT TABS: [Pieces] [Setup]

PIECES tab:
─────────────────
RED          BLUE
Commander    Commander
General      General
...

SETUP tab:
─────────────────
FEN: [input]
Turn: red • blue
[load FEN]
```

- Board in center, piece palettes in Pieces tab
- Setup controls (FEN input, turn selection) in Setup tab
- Actions (clear, export, share) as text links below board

### Learn Hub

```
CENTER:
┌─────────────────────────────┐
│ LEARN                       │
│─────────────────────────────│
│ Basics             4/10     │
│ Tactics            0/8      │
│ Combined Arms      0/6      │
│ Advanced           locked   │
└─────────────────────────────┘
```

- Flat list of subjects with progress counts
- No cards, no icons, no decorative UI
- Click a subject → flat list of lessons
- No right panel on hub

### Learn Lesson

```
CENTER:
┌─────────────────────────────┐
│         ┌─────────┐         │
│         │         │         │
│         │  BOARD  │         │
│         │         │         │
│         └─────────┘         │
│                             │
└─────────────────────────────┘

RIGHT TABS: [Lesson] [Hints]

LESSON tab:
─────────────────
Move the infantry
to capture the
enemy position.

[continue]

HINTS tab:
─────────────────
hint 1: look at
the diagonal...
```

- Board dominates center
- Lesson instructions in right panel
- Hints in separate tab
- `continue` as text link

### User Pages (Profile, Friends, Settings, History)

Full-width center content. No right panel tabs.

- **Profile**: flat text — display name, member since, stats. No avatar circle, no card
- **Friends**: flat list — name, status dot, action links (remove, invite)
- **Settings**: flat form — label + input pairs, thin dividers between sections
- **History**: flat list — opponent, result, time control, date. Click to replay

All styled with:

- Section headers as uppercase monospace
- Thin dividers between sections
- Text links for actions
- No cards, no badges, no rounded anything

## CSS Cleanup

### Remove

- All `border-radius: 12px` and `border-radius: 9999px`
- All `box-shadow` on non-dialog elements
- All `background: var(--theme-bg-panel)` on content cards (keep only on right panel)
- All `btn-game-*` classes from `app.css` (replace with new minimal button styles)
- All icon imports in content areas (keep only in root layout sidebar)
- The `.hud-corners` system (unless used on the board itself)
- `.demo-badge`, `.feature-card`, `.coming-soon-card` and all marketing styles
- `.cta-button` styles

### Add

- `.section-header` — uppercase monospace section labels
- `.divider` — 1px horizontal rule
- `.text-link` — plain text action (color on hover, underline on hover)
- `.primary-cta` — the one colored button per page
- `.toggle-group` — text items separated by dots, active/inactive states
- `.flat-list` — dense list with minimal spacing

### Keep

- Theme CSS variable system (all `--theme-*` vars)
- `@theme` block in app.css (Tailwind integration)
- Board-specific CSS (`$lib/styles/board.css`)
- Auth page styles (excluded from redesign)

## Technical Notes

- Board component (`@cotulenh/board`) untouched
- Auth flows, Supabase integration, realtime subscriptions unchanged
- Theme system unchanged (CSS variables applied to new flat styles)
- i18n system unchanged
- Existing `ResponsiveLayout` component may become unnecessary if CommandCenter handles mobile
