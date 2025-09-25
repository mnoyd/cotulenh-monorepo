# Deploy System Testing Guide

## Overview

The cotulenh-app has been updated to use the new deploy session system from cotulenh-core. Here's how to test and verify the integration.

## Current Status

✅ **Completed Updates:**

- Updated main page to pass `core` instance to board
- Added new deploy event handlers (`afterDeployStep`, `afterDeployComplete`)
- Created DeployPanel component for manual deploy testing
- Updated game store with new deploy session methods
- Maintained backward compatibility with legacy `afterStackMove`

⚠️ **Known Issues:**

- TypeScript errors due to packages needing rebuild
- New API methods not yet available in compiled packages

## Testing Steps

### 1. Build the Packages

First, rebuild the packages to include the new deploy system:

```bash
# From monorepo root
pnpm build

# Or build specific packages
pnpm --filter @repo/cotulenh-core build
pnpm --filter @repo/cotulenh-board build
```

### 2. Start the Development Server

```bash
# From monorepo root (as per memory)
pnpm --filter cotulenh-app dev
```

### 3. Test Deploy Functionality

#### Manual Deploy Testing (via DeployPanel):

1. **Start a Deploy Session:**

   - Enter a square with a stack (e.g., "e4") in the Deploy Panel
   - Click "Start Deploy" button
   - The panel should show remaining pieces

2. **Deploy Individual Pieces:**

   - For each remaining piece, enter a target square
   - Click "Deploy" to move the piece
   - Click "Stay" to keep the piece on the stack

3. **Complete Deploy:**
   - Click "Complete Deploy" to finish manually
   - Or let it auto-complete when all pieces are moved

#### Programmatic Testing (via Console):

```javascript
// Access the board API from browser console
const boardApi = window.boardApi; // You may need to expose this

// Start deploy session
boardApi.startDeploy('e4');

// Check if deploy is active
console.log('Deploy active:', boardApi.isDeployActive());

// Get remaining pieces
console.log('Remaining pieces:', boardApi.getRemainingDeployPieces());

// Deploy a piece
boardApi.deployStep({
  from: 'e4',
  to: 'e6',
  piece: 'tank'
});

// Make a piece stay
boardApi.stayMove('infantry');

// Complete deploy
boardApi.completeDeploy();
```

### 4. Verify Event Handling

Check the browser console for deploy event logs:

- `Deploy step completed:` - Should appear after each deployStep
- `Deploy session completed:` - Should appear when deploy finishes
- Game state should update automatically after each step

### 5. Test Integration with Core

Verify that the board properly communicates with the core:

1. **FEN Updates:** Board should reflect piece movements immediately
2. **Turn Management:** Turn should switch after deploy completion
3. **Move Generation:** Available moves should update during deploy
4. **State Consistency:** Game state should remain consistent

## Expected Behavior

### During Deploy Session:

- Only pieces from the deploy stack should be movable
- Available destinations should be filtered by piece type
- Each piece can be moved individually or stay on stack
- Board should update after each deploy step

### After Deploy Completion:

- Turn should switch to opponent
- All pieces should be movable again (if it's their turn)
- Deploy session should be cleared
- Game should continue normally

## Troubleshooting

### TypeScript Errors:

- Run `pnpm build` to rebuild packages with new types
- Restart the dev server after rebuilding

### Deploy Not Starting:

- Check console for error messages
- Verify the square contains a valid stack
- Ensure core instance is properly passed to board

### Events Not Firing:

- Check that event handlers are properly registered
- Verify board configuration includes new event types
- Look for JavaScript errors in console

### State Inconsistency:

- Check that core and board are properly synchronized
- Verify FEN updates are working
- Look for errors in deploy adapter

## Debug Commands

```javascript
// Check current game state
console.log('Game FEN:', game.fen());
console.log('Current turn:', game.turn());
console.log('Deploy active:', game.isDeployActive?.());

// Check board state
console.log('Board pieces:', boardApi.state.pieces);
console.log('Deploy session:', boardApi.state.deploySession);

// Check available moves
console.log('Possible moves:', game.moves({ verbose: true }));
```

## Next Steps

After successful testing:

1. **Remove Legacy Code:** Clean up old `stackPieceMoves` references
2. **Add More Tests:** Create automated tests for deploy scenarios
3. **Improve UI:** Enhance DeployPanel with better UX
4. **Documentation:** Update user documentation with new deploy features
5. **Performance:** Optimize deploy session handling for large stacks

## Files Modified

- `src/routes/+page.svelte` - Main page with board integration
- `src/lib/stores/game.ts` - Game state management
- `src/lib/components/DeployPanel.svelte` - Deploy control UI
- `packages/cotulenh-board/` - Board package with new deploy system
- `packages/cotulenh-core/` - Core package with deploy sessions
