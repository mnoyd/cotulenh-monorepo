# FEN-Based Deploy State Implementation

## Overview

Implemented FEN-based deploy state management where the board derives deploy session information from extended FEN format instead of managing it locally.

## Changes Made

### 1. FEN Parsing (`src/fen.ts`)

- **Added `ParsedFEN` interface** with optional `deployState` field
- **Added `readWithDeployState()`** function to parse extended FEN format
  - Format: `{baseFEN} DEPLOY {square}:{moves}...`
  - Example: `6c4/1n2fh1hf2/... r - - 0 1 DEPLOY c3:Nc5,Fd4...`
- **Added `parseDeployMoves()`** helper to parse move notation
  - Supports: `Nc5`, `F(EI)xd4`, `Te5`
  - Extracts piece type, destination, and capture flag
- **Refactored `read()`** to use `readWithDeployState()` internally
- **Extracted `parseBaseFEN()`** for reusability

### 2. State Management (`src/state.ts`)

- **Updated `deploySession` interface**:
  ```typescript
  deploySession?: {
    originSquare: cg.Key;
    deployedMoves: Array<{
      piece: string;
      to: cg.Key;
      capture: boolean;
    }>;
    isComplete: boolean; // false if ends with "..."
  }
  ```
- Removed `isActive` boolean (replaced by `isComplete`)
- Added `deployedMoves` array to track all deployed pieces

### 3. Configuration (`src/config.ts`)

- **Updated `configure()`** to parse deploy state from FEN
- When FEN is provided:
  1. Parse extended FEN with `readWithDeployState()`
  2. Extract pieces and deploy state
  3. Update `state.deploySession` from parsed data
  4. Clear `deploySession` if no DEPLOY marker found

### 4. Rendering (`src/render.ts`)

- **Enhanced `computeSquareClasses()`** to add deploy highlights:
  - `deploy-origin`: Origin square (stack being deployed)
  - `deploy-dest`: Destination squares where pieces deployed
  - `deploy-incomplete`: Pulsing indicator for ongoing deployment

### 5. Styling (`assets/commander-chess.clasic.css`)

- **Added deploy state CSS classes**:
  ```css
  .deploy-origin       /* Gold background with border */
  .deploy-dest         /* Green tint for deployed squares */
  .deploy-incomplete   /* Pulsing animation */
  @keyframes pulse-deploy /* Smooth pulse effect */
  ```

### 6. Board Logic (`src/board.ts`)

- **Already refactored** (previous commit)
- Board no longer manages deploy state
- Only detects stack moves and sends to core

## Data Flow

### Before (Broken)

```
User move → Board updates local deploySession → Sends to core
                                                    ↓
                                            Core returns FEN
                                                    ↓
                                    Board ignores FEN deploy info ❌
```

### After (Correct)

```
User move → Board sends to core via callback
                    ↓
            Core updates DeploySession
                    ↓
            Core returns extended FEN: "...DEPLOY c3:Nc5,Fd4..."
                    ↓
            Board parses FEN with readWithDeployState()
                    ↓
            Board extracts deploySession from FEN
                    ↓
            Board renders:
              • Origin square highlighted (gold)
              • Deployed squares highlighted (green)
              • Remaining pieces at origin
              • Pulsing indicator if incomplete
```

## Extended FEN Format

### Complete Deployment

```
6c4/1n2fh1hf2/3a2s2a1/... r - - 0 1 DEPLOY c3:Nc5,Fd4,Te5
```

### Incomplete Deployment (ongoing)

```
6c4/1n2fh1hf2/3a2s2a1/... r - - 0 1 DEPLOY c3:Nc5,Fd4...
```

Note the `...` suffix indicating more pieces remain to be deployed.

### Move Notation Examples

- `Nc5` - Navy to c5
- `F(EI)xd4` - Air Force carrying Engineer and Infantry, captures on d4
- `Te5` - Tank to e5

## Benefits

✅ **Single source of truth**: Core owns deploy state via FEN  
✅ **Undo/redo support**: Deploy state in FEN enables full history navigation  
✅ **Save/load games**: Mid-deployment positions can be saved/loaded  
✅ **Visual feedback**: Clear indicators for origin, destinations, and status  
✅ **Stateless board**: Board is purely a view layer

## Testing

To test the implementation:

1. **Parse extended FEN**:

   ```typescript
   const parsed = readWithDeployState('...DEPLOY c3:Nc5,Fd4...');
   console.log(parsed.deployState);
   ```

2. **Check rendering**:
   - Origin square should have gold background with border
   - Deployed squares should have green tint
   - Incomplete deployments should pulse

3. **Verify state updates**:
   - Set FEN with DEPLOY marker
   - Check `state.deploySession` is populated
   - Set normal FEN
   - Check `state.deploySession` is undefined

## Core Integration

The core (`cotulenh-core`) already generates extended FEN via:

- `DeploySession.toExtendedFEN()` (deploy-session.ts:252-284)
- `CoTuLenh.fen()` (cotulenh.ts:354-357)

Board now correctly consumes this format.
