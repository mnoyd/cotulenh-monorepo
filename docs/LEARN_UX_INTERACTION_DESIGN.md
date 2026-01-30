# Learn System - UI/UX Interaction Design

## Core Philosophy: Learn by Doing, Discover by Playing

Users should **interact first, understand naturally** rather than read-then-do. The UI guides exploration without overwhelming.

---

## 1. Interactive Entry Points

### Subject Cards - Hover Preview

```
┌─────────────────────────────────┐
│ 🎯 Basic Movement          [●○○] │ ← Progress dots
│                                   │
│ Learn how pieces move            │
│                                   │
│ [ON HOVER: Animate preview]      │
│ ┌─────────┐                      │
│ │ mini    │ ← Animated board     │
│ │ board   │   showing sample     │
│ │ preview │   piece movement     │
│ └─────────┘                      │
│                                   │
│ 3 sections • 12 lessons          │
│ ⏱️ ~15 min                        │
└─────────────────────────────────┘
```

**Interaction**: Hover shows animated preview of what you'll learn (no click needed)

### Progress Ring Animation

```
Unlocked:  ⭕ → 🎯 (pulsing glow)
Locked:    🔒 (shake on click + tooltip: "Complete Basic Movement first")
Completed: ✅ (green glow)
```

---

## 2. Lesson Entry - Interactive Introduction

Instead of text-heavy introductions, use **step-through interactions**:

### Example: Air Force Lesson

```
Step 1: [Board appears with Air Force piece]
        ↓ Highlight square, tooltip appears
        "This is the Air Force. Try clicking it."

Step 2: [User clicks, valid moves light up]
        "Notice it can fly anywhere! Try moving it."

Step 3: [User moves, Anti-Air appears with red zone]
        "⚠️ But watch out for Air Defense zones!"
        [Red zone pulses]

Step 4: [Challenge appears]
        "Now you try: Navigate to the target 🎯"
```

**Key**: Each step requires interaction before revealing next concept.

---

## 3. Board Interaction Patterns

### A. Contextual Tooltips (Appear on Hover)

```
Hover on piece → Shows:
┌──────────────────┐
│ 🪖 Infantry      │
│ Moves 1 square   │
│ Any direction    │
│ [Try it ↗️]      │
└──────────────────┘

Hover on target square → Shows:
┌──────────────────┐
│ 🎯 Move here     │
│ to continue      │
└──────────────────┘

Hover on restricted zone → Shows:
┌──────────────────┐
│ 🚫 Navy only     │
│ Land pieces      │
│ cannot enter     │
└──────────────────┘
```

### B. Visual Feedback Layers

```
1. Selection: Piece glows blue
2. Valid moves: Squares show subtle green highlight
3. Targets: Pulsing gold ring 🎯
4. Forbidden: Red X appears on hover ⛔
5. Hint: Dotted arrow from piece to target
```

### C. Progressive Hints System

```
Time/Attempts    Hint Level
─────────────────────────────
0-10s           None (let them explore)
10-20s          Subtle: Target square pulses
20-40s          Medium: Arrow appears
40s+            Strong: "Try moving Infantry to c4"
Wrong move ×3   Tutorial: Step-by-step guide
```

---

## 4. Exploration Modes

### Mode 1: Guided Mode (Default for new concepts)

- Clear target indicators
- Invalid moves blocked with explanation
- Hints auto-appear on timer
- "Why?" button explains rules on demand

### Mode 2: Practice Mode (After completing guided)

- Minimal UI
- Figure it out yourself
- Hints available but hidden
- Better star rating for less help

**Toggle**: Top-right corner

```
[🎓 Guided] ⟷ [🎮 Practice]
```

---

## 5. Feedback & Error Handling

### Wrong Move Feedback

```
❌ Instead of generic "Invalid move":

Scenario: User tries to move Navy onto land

Visual:
1. Piece "bounces back" with shake animation
2. Red zone briefly highlights the land area
3. Tooltip appears:
   ┌──────────────────────────┐
   │ 🌊 Navy pieces need water │
   │ Try moving to file a-b    │
   │ [Show me →]               │
   └──────────────────────────┘
4. "Show me" highlights valid squares
```

### Success Feedback

```
✅ Multi-layer celebration:

1. Immediate: Piece lands with satisfying "thunk" sound
2. Target hit: Gold sparkle effect ✨
3. Lesson complete:
   ┌─────────────────────────────┐
   │  ⭐⭐⭐ Perfect! ⭐⭐⭐         │
   │                             │
   │  You completed in 3 moves   │
   │  (Optimal: 3 moves)         │
   │                             │
   │  [Next Lesson →]            │
   │  [Practice Again]           │
   └─────────────────────────────┘
```

---

## 6. Navigation & Flow

### Smart Lesson Navigation

```
Top Bar:
┌────────────────────────────────────────────┐
│ ← Back to Subjects   [2/12] ━━━○○○○○○○○   │
│                       ↑                     │
│                  Current lesson             │
└────────────────────────────────────────────┘

Bottom Bar (appears after completion):
┌────────────────────────────────────────────┐
│ [← Previous]    [Try Again]    [Next →]   │
│                                             │
│ 💡 Tip: Try Practice Mode for better stars │
└────────────────────────────────────────────┘
```

### Section Completion Celebration

```
After completing all lessons in a section:
┌─────────────────────────────────────┐
│         🎉 Section Complete!        │
│                                     │
│    Basic Movement Mastered          │
│                                     │
│ ⭐⭐⭐ 12/12 lessons (Perfect!)      │
│                                     │
│ 🔓 Unlocked: Terrain System         │
│                                     │
│ [Continue to Terrain →]             │
│ [Back to Subjects]                  │
└─────────────────────────────────────┘
```

---

## 7. Discovery Features

### A. "What If" Mode

Toggle in lesson UI:

```
[Normal] ⟷ [What If?]

What If Mode:
- Remove restrictions temporarily
- Let users try "illegal" moves
- Show immediate consequence
- Example: "If Infantry could fly, it would..."
- Teaching tool for understanding WHY rules exist
```

### B. Piece Encyclopedia (Inline)

```
Right-click any piece → Quick reference:
┌──────────────────────────┐
│ 🪖 Infantry              │
│ ━━━━━━━━━━━━━━━━━━━━━━━  │
│ Movement: 1 square       │
│ Terrain: Land only       │
│ Capture: Normal          │
│                          │
│ [Interactive Demo]       │
│ [See All Infantry Moves] │
└──────────────────────────┘
```

### C. Visual Rule Reminders

```
Bottom corner (collapsible):
┌────────────────┐
│ 📋 This Lesson │
│ • Navy zones   │
│ • Bridge rules │
│ [Expand ↓]     │
└────────────────┘

Expanded:
┌────────────────────────────┐
│ 📋 Quick Reference         │
│                            │
│ 🌊 Navy Zone: Files a-b    │
│ 🏞️ Land Zone: Files d-h    │
│ 🌉 Bridges: f6, f7, h6, h7 │
│                            │
│ [Pin to Board]             │
└────────────────────────────┘
```

---

## 8. Responsive Micro-Interactions

### Hover States

```
Subject Card:
  Rest → Lift (2px shadow)
  Hover → Glow + Scale(1.02)

Lesson Tile:
  Rest → Flat
  Hover → Border glow + Show preview
  Completed → Green checkmark badge

Buttons:
  Rest → Subtle gradient
  Hover → Stronger gradient + Scale(1.05)
  Active → Scale(0.98) + Haptic feedback (mobile)
```

### Loading States

```
Instead of spinners, use contextual animations:
- Loading lesson → Chess piece rotating
- Checking move → Piece "thinking" animation
- Loading subject → Book opening animation
```

---

## 9. Accessibility & Customization

### Visual Preferences Panel

```
⚙️ Settings (accessible from any lesson):
┌────────────────────────────┐
│ Reduce Animations    [○]   │
│ High Contrast        [●]   │
│ Larger Tooltips      [○]   │
│ Auto-Hints (timer)   [●]   │
│ Sound Effects        [●]   │
│ Keyboard Shortcuts   [○]   │
└────────────────────────────┘
```

### Keyboard Navigation

```
Tab       → Cycle through interactive elements
Space     → Select/Confirm
Arrow Keys → Navigate board squares
H         → Show hint
R         → Restart lesson
Esc       → Back to menu
?         → Show keyboard shortcuts
```

---

## 10. Mobile-First Considerations

### Gesture Support

```
Tap piece       → Select
Drag piece      → Move (with ghost preview)
Long press      → Show piece info
Swipe left/right → Previous/Next lesson
Pinch zoom      → Zoom board (for visibility)
```

### Bottom Sheet UI (Mobile)

```
Lesson controls slide up from bottom:
┌────────────────────────────┐
│ [Handle to drag]  ━━━━━    │
│                            │
│ Move Infantry to c4 🎯     │
│                            │
│ 💡 Hint  🔄 Restart        │
└────────────────────────────┘
```

---

## Implementation Priority

### Phase 1: Core Interactions ✅ (Current)

- Subject card grid
- Basic lesson player
- Simple feedback messages

### Phase 2: Enhanced Feedback (Next 🎯)

1. Contextual tooltips on hover
2. Visual feedback layers (glow, pulse, bounce)
3. Progressive hint system
4. Wrong move animations + explanations

### Phase 3: Discovery Features

1. Interactive introductions (step-through)
2. "What If" mode
3. Inline piece encyclopedia
4. Visual rule reminders

### Phase 4: Polish & Accessibility

1. Micro-interactions and animations
2. Sound effects
3. Keyboard navigation
4. Mobile gestures
5. Customization settings

---

## Component Architecture for UX

```typescript
// Composable interaction components

<Tooltip trigger="hover" position="top">
  Content appears on hover, auto-positions to avoid edges
</Tooltip>

<HintSystem
  autoShowDelay={20000}
  levels={['subtle', 'medium', 'explicit']}
  onHintShown={(level) => trackHint(level)}
/>

<FeedbackAnimation
  type="wrongMove"
  reason="terrain"
  target={square}
/>

<InteractiveIntro
  steps={introSteps}
  onComplete={() => startLesson()}
/>

<ProgressRing
  current={8}
  total={12}
  animate={true}
/>
```

---

## Metrics to Track (Learning Analytics)

```typescript
interface LessonMetrics {
  // Exploration behavior
  timeToFirstMove: number;
  hoverEvents: number; // Did they explore before moving?

  // Struggle indicators
  wrongMoveCount: number;
  hintsUsed: number;
  restartCount: number;

  // Engagement
  lessonDuration: number;
  practiceRepeats: number; // Voluntary replays

  // Success
  completionRate: number;
  averageStars: number;
}
```

Use these to:

- Identify lessons that are too hard/easy
- Optimize hint timing
- Improve instructions
- A/B test UX patterns

---

## Summary: Learning Experience Flow

```
1. User sees subject → Hovers → Animated preview plays → Clicks
2. Interactive intro → Step-by-step interaction → Understanding builds
3. Challenge appears → User explores → Hovers get tooltips → Makes move
4. Wrong move → Animated feedback → Clear explanation → Try again
5. Right move → Satisfying feedback → Progress shown → Next challenge
6. Complete lesson → Celebration → Stats → Natural flow to next
7. Complete subject → Big celebration → Unlock next → Motivates continuation
```

**Key Principle**: Every interaction teaches. Every feedback moment is a learning opportunity. Every success feels earned and celebrated.
