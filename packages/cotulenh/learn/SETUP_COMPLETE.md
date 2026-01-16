# @cotulenh/learn

✅ **Package scaffolded successfully!**

## What We Built

Inspired by Lichess Learn architecture, created a reusable tutorial package:

### Structure

```
packages/cotulenh/learn/
├── src/
│   ├── controllers/          # State management (Lichess pattern)
│   │   ├── LearnController.ts   # Top-level coordinator
│   │   ├── StageController.ts   # Stage lifecycle manager
│   │   └── LevelController.ts   # Level validation engine
│   ├── stages/              # Declarative level definitions
│   │   ├── basic-move.ts
│   │   ├── capture.ts
│   │   └── index.ts
│   └── types/              # TypeScript interfaces
└── __tests__/             # Tests (3 passing ✅)
```

### Demo App

Created `/learn` route in the app that:

- Lists all learning stages
- Loads individual levels
- Shows goals and FEN positions
- Navigates between levels

## Usage

```typescript
import { LearnController } from '@cotulenh/learn';

const learn = new LearnController();
learn.selectStage('basic-move');
const level = learn.getCurrentStageController()?.getCurrentLevel();
```

## Next Steps

1. **Integrate game engine**: Wire up LevelController.validateMove() with @cotulenh/core
2. **Add visual board**: Use @cotulenh/board to show interactive puzzles
3. **Create more stages**: Deploy, Combine, Recombine, Terrain, Air Defense
4. **Add progress tracking**: localStorage or backend sync
5. **Scenario system**: For complex interactive lessons
6. **Visual feedback**: Stars, hints, success animations

## Key Lessons from Lichess

✅ Declarative level data (FEN + goals)
✅ Controller hierarchy for separation of concerns  
✅ Progressive difficulty within stages
✅ Reusable package architecture

Ready to expand with cotulenh-specific mechanics!
