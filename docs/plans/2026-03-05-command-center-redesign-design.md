# Command Center UI Redesign

## Overview

Complete UI/UX redesign of the CoTuLenh app shell, replacing the current layout with an IDE-style Command Center. The board dominates the center; all context lives in a right-side tab panel. Navigation moves to a slim icon-only rail.

## Architecture Decision

**Approach: Slot-Based Layout Component**

A single `CommandCenter.svelte` component defines the 3-panel grid. Each page passes center content and tab definitions via Svelte 5 snippets. No route restructuring required.

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

- **Left rail**: 48px, icon-only, persistent on desktop
- **Center area**: Flexible width, board-dominant on game pages
- **Right panel**: 320px fixed, tab bar + scrollable content
- **Scope**: All pages except `/auth/*`

## Left Icon Rail (48px)

VS Code activity bar style. Icons only, no text labels.

### Items (top to bottom)

- Logo (24px)
- Divider
- Home, Play, Puzzles, Editor, Friends (auth-only)
- Spacer
- Divider
- Settings (opens dialog), Feedback (opens dialog)
- User avatar (opens dropdown) or Sign In link

### Styling

- 40x40px icon touch targets, centered in 48px rail
- Active state: 2px accent-colored left edge bar (no filled background)
- Hover: icon color shifts to accent
- Monochrome icons, single color
- Tooltips on hover (right-aligned)

## Right Panel Tab System

### Tab Bar

- Plain text labels, monospace, uppercase
- Active tab: 2px bottom accent underline + brighter text
- Inactive tabs: `text-secondary` color
- No backgrounds, no borders, no decoration
- Instant content swap on click (zero animation)

### Tab Content

- Scrolls independently (layout never shifts)
- Full height of the panel minus the tab bar

### Per-Page Tab Config

| Page            | Tabs                    |
| --------------- | ----------------------- |
| Home            | Activity, Friends       |
| Play (local)    | Moves, Cards            |
| Play (online)   | Moves, Cards, Chat      |
| Learn           | Lesson, Hints, Progress |
| Board Editor    | Pieces, Setup           |
| Puzzles         | Moves, Hints            |
| Profile/Friends | Single panel (no tabs)  |

### Component Interface

```ts
interface Tab {
  id: string;
  label: string;
  content: Snippet;
}
// Pages pass tabs: Tab[] to CommandCenter
```

## Center Area

### Board Pages (Play, Learn, Editor, Puzzles)

- Board fills max available height, aspect-ratio locked
- Centered horizontally with minimal padding
- Player names + clocks in a thin bar below the board

### Home Page (Split-Pane Dashboard)

- 2-column split in the center area
- Left: Active games list + Quick Play / Create Game buttons
- Right: Read-only mini-board (current lesson, last position, or featured game)

### Other Pages (Profile, Friends, Settings)

- Full-width center content
- Right panel shows context-aware tabs if defined; minimal/empty state if none

## Mobile (< 768px)

### Layout

- Left rail: hidden (hamburger menu in top-left)
- Right panel: hidden by default
- Board: full viewport width, maximized height
- Home: single column (game list above mini-board)

### Right Panel Toggle

- Floating icon button (top-right) toggles a full-screen overlay
- Overlay has close button (top-left) + same tab system
- Slides in from right

## Visual System

### Typography

- Monospace for labels, stats, move lists, navigation
- UI font for body text
- All nav text: uppercase monospace

### Color

- Dark-first, high contrast
- Accent color: active indicators and interactive elements only
- Backgrounds: stark (`bg-dark` main, `bg-panel` surfaces, no gradients)
- Borders: minimal 1px, structural separation only

### Spacing

- Dense, tight spacing (~25% reduction from current)
- No decorative whitespace
- Information-rich, utilitarian density

### Surface Treatment

- No rounded card containers with backgrounds (flat content + subtle dividers)
- No button gradients or shadows (flat with border on hover)
- Dropdown menus: plain text lists with hover highlight

### What Stays

- Board component internals (working well)
- Theme CSS variable system (themes applied to new layout)
- Auth pages (excluded from redesign)

## Technical Notes

- Board component (`@cotulenh/board`) is untouched — only the surrounding app shell changes
- Existing Supabase integration, auth flows, realtime subscriptions unchanged
- Theme system continues to work via CSS variables
- i18n system unchanged (tooltip text goes through i18n)
