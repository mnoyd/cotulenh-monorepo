# System Architecture Overview

## High-Level Architecture

The CoTuLenh system follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Demo Applications                        │
│  apps/cotulenh-app/ (Svelte) - Connects board and core     │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer                                 │
│  packages/cotulenh-board/ - Visual board component         │
│  - Handles user interactions (drag/drop, clicks)           │
│  - Renders pieces and board state                          │
│  - Delegates all logic to application layer                │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Application Layer                           │
│  apps/cotulenh-app/src/lib/ - State management & glue      │
│  - Game store (Svelte stores)                              │
│  - Event handling and coordination                         │
│  - Type conversions between board and core                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Core Engine                               │
│  packages/cotulenh-core/ - Game logic and rules            │
│  - Move generation and validation                          │
│  - Game state management                                   │
│  - Deploy session handling                                 │
│  - FEN/SAN serialization                                   │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Principles

### 1. Single Source of Truth

- **Core engine** (`cotulenh-core`) is the authoritative source for all game state
- All game logic, rules, and state transitions happen in the core
- UI components are reactive and display what the core tells them

### 2. Delegation Pattern

- **Board UI** (`cotulenh-board`) is intentionally "dumb" - it only handles:
  - User input capture (mouse/touch events)
  - Visual rendering of pieces and board
  - Triggering callbacks to the application layer
- **Application layer** (Svelte app) coordinates between board and core
- **Core engine** makes all decisions about game state

### 3. Reactive Data Flow

- State changes flow in one direction: Core → App → Board
- UI updates are triggered by FEN string changes
- Legal moves are recalculated after every state change

### 4. Virtual State Management

- Deploy sessions use virtual overlays that don't mutate the base board state
- FEN encoding includes virtual state for consistent representation
- State can be rolled back easily since base state is preserved

## Package Responsibilities

### packages/cotulenh-core/

**Purpose**: Game engine and business logic

- Move generation and validation
- Game state management (board, turn, deploy sessions)
- Rule enforcement (check, checkmate, legal moves)
- Serialization (FEN, SAN notation)
- Deploy session management with virtual state

### packages/cotulenh-board/

**Purpose**: Visual board component

- Piece rendering and animations
- User interaction handling (drag/drop, selection)
- Board visualization (squares, coordinates, highlights)
- Event callbacks to application layer
- **Should NOT**: Make game logic decisions, manage game state

### apps/cotulenh-app/

**Purpose**: Application coordination and state management

- Svelte stores for reactive state management
- Event handling between board and core
- Type conversions and data mapping
- UI component coordination
- Demo application functionality

## Data Flow Pattern

```
User Action (drag piece)
        ↓
Board captures event
        ↓
Board calls movable.events.after(orig, dest)
        ↓
Svelte app receives callback
        ↓
App calls game.move({from, to, ...})
        ↓
Core processes move, updates state/deploy session
        ↓
Core returns Move object (or null if illegal)
        ↓
App updates gameStore with new state
        ↓
Reactive update: gameStore.subscribe() triggers
        ↓
App calls boardApi.set() with new FEN and legal moves
        ↓
Board updates visual representation
```

## Critical Design Decisions

### Why Board is "Dumb"

- **Consistency**: Only one place (core) makes game logic decisions
- **Testability**: All game logic is in one testable package
- **Maintainability**: Changes to rules only require core updates
- **Reusability**: Board can be used with different game engines

### Why Deploy Sessions Use Virtual State

- **Rollback**: Can easily undo partial deployments
- **Consistency**: FEN always represents the true game state
- **Performance**: No need to mutate and restore board state
- **Debugging**: Clear separation between committed and tentative moves

### Why FEN-Based Updates

- **Serialization**: Game state can be easily saved/loaded
- **Consistency**: Single format for all state representation
- **Debugging**: Human-readable state representation
- **Network**: Easy to sync state across network connections

## Common Misconceptions

❌ **Wrong**: Board should manage deploy sessions internally
✅ **Correct**: Board delegates all logic to core via app layer

❌ **Wrong**: Board should calculate legal moves
✅ **Correct**: Core calculates legal moves, board displays them

❌ **Wrong**: Deploy sessions should mutate board state directly
✅ **Correct**: Deploy sessions use virtual overlays, FEN shows effective state

❌ **Wrong**: Each package should be self-contained
✅ **Correct**: Clear delegation hierarchy with single source of truth
