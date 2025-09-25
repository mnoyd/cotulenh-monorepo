# Migration Guide: New Deploy System

This document outlines the changes made to `cotulenh-board` to integrate with the new deploy session system from `cotulenh-core`.

## Overview

The board package has been updated to use the new incremental deploy session system from `cotulenh-core`, replacing the legacy `stackPieceMoves` approach.

## Key Changes

### 1. New Types Added

```typescript
// New deploy session types
export interface DeploySession {
  isActive: boolean;
  stackSquare: Key;
  turn: Color;
  remainingPieces: Piece[];
  availablePieceTypes: Role[];
}

export interface DeployMove {
  from: Key;
  to: Key;
  piece: Role;
  stay?: boolean;
}

export interface DeployStepResult {
  success: boolean;
  isComplete: boolean;
  remainingPieces: Piece[];
}
```

### 2. Configuration Changes

```typescript
// Add core instance to board config
const config = {
  core: cotulenhGameInstance, // CoTuLenh instance
  // ... other config options
  movable: {
    events: {
      // Legacy event (still supported)
      afterStackMove?: (stackMove: StackMove, metadata: MoveMetadata) => void;

      // New deploy events
      afterDeployStep?: (deployMove: DeployMove, metadata: MoveMetadata) => void;
      afterDeployComplete?: (deploySession: DeploySession, metadata: MoveMetadata) => void;
    }
  }
};
```

### 3. New API Methods

```typescript
const board = CotulenhBoard(element, config);

// Start a deploy session from a stack square
board.startDeploy('e4');

// Execute individual deploy steps
board.deployStep({
  from: 'e4',
  to: 'e6',
  piece: 'tank',
});

// Handle stay moves (piece remains on stack)
board.stayMove('infantry');

// Check deploy status
if (board.isDeployActive()) {
  const remainingPieces = board.getRemainingDeployPieces();
  console.log('Remaining pieces:', remainingPieces);
}

// Complete deploy session manually (if needed)
board.completeDeploy();
```

## Migration Steps

### For Existing Applications

1. **Update Configuration**: Add the `core` instance to your board configuration:

```typescript
import { CoTuLenh } from 'cotulenh-core';
import { CotulenhBoard } from 'cotulenh-board';

const game = new CoTuLenh();
const board = CotulenhBoard(element, {
  core: game,
  // ... existing config
});
```

2. **Update Event Handlers**: Replace or supplement `afterStackMove` with new deploy events:

```typescript
const config = {
  core: game,
  movable: {
    events: {
      // Handle individual deploy steps
      afterDeployStep: (deployMove, metadata) => {
        console.log('Deploy step:', deployMove);
      },

      // Handle deploy completion
      afterDeployComplete: (deploySession, metadata) => {
        console.log('Deploy completed:', deploySession);
      },

      // Legacy support (optional)
      afterStackMove: (stackMove, metadata) => {
        console.log('Legacy stack move:', stackMove);
      },
    },
  },
};
```

3. **Use New API Methods**: Replace direct state manipulation with API calls:

```typescript
// Old approach (no longer works)
// state.stackPieceMoves = { ... };

// New approach
board.startDeploy('e4');
board.deployStep({ from: 'e4', to: 'e6', piece: 'tank' });
```

## Example Usage

```typescript
import { CoTuLenh } from 'cotulenh-core';
import { CotulenhBoard } from 'cotulenh-board';

// Initialize game and board
const game = new CoTuLenh();
const board = CotulenhBoard(document.getElementById('board'), {
  core: game,
  movable: {
    events: {
      afterDeployStep: (deployMove, metadata) => {
        console.log(`Deployed ${deployMove.piece} from ${deployMove.from} to ${deployMove.to}`);

        if (deployMove.stay) {
          console.log(`${deployMove.piece} stayed on the stack`);
        }
      },

      afterDeployComplete: (deploySession, metadata) => {
        console.log('Deploy session completed');
        console.log('Remaining pieces:', deploySession.remainingPieces);
      },
    },
  },
});

// Example deploy workflow
async function handleDeploy(stackSquare) {
  // Start deploy session
  const success = board.startDeploy(stackSquare);
  if (!success) {
    console.error('Failed to start deploy session');
    return;
  }

  // Deploy pieces one by one
  while (board.isDeployActive()) {
    const remainingPieces = board.getRemainingDeployPieces();

    if (remainingPieces.length === 0) {
      break;
    }

    // Example: deploy first remaining piece
    const piece = remainingPieces[0];
    const result = board.deployStep({
      from: stackSquare,
      to: 'f6', // destination square
      piece: piece.role,
    });

    if (!result.success) {
      console.error('Deploy step failed');
      break;
    }

    if (result.isComplete) {
      console.log('Deploy completed automatically');
      break;
    }
  }
}
```

## Breaking Changes

1. **Removed Properties**: `state.stackPieceMoves` no longer exists
2. **Function Signatures**: Some internal functions have changed signatures
3. **Event Names**: New event names for deploy-specific callbacks

## Backward Compatibility

- Legacy `afterStackMove` events are still supported
- Existing move functionality remains unchanged
- Only deploy-related functionality has been updated

## Benefits

1. **Better Integration**: Direct integration with `cotulenh-core` deploy sessions
2. **Incremental Deploys**: Support for step-by-step piece deployment
3. **Cleaner API**: More intuitive methods for deploy operations
4. **Better State Management**: Deploy state is managed by the core game engine
5. **Event Granularity**: Separate events for deploy steps and completion
