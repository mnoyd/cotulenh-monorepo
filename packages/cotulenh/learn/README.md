# @cotulenh/learn

Interactive tutorial system for learning Cotulenh game mechanics, inspired by Lichess Learn.

## Architecture

Based on Lichess Learn's successful patterns:

- **Declarative level definitions**: Levels are data objects (FEN, goals, moves)
- **Controller hierarchy**: LearnController → StageController → LevelController
- **Progressive complexity**: Stages teach concepts from basic to advanced
- **Immediate feedback**: Real-time move validation and success detection

## Structure

```
src/
├── controllers/       # State management
│   ├── LearnController.ts   # Top-level coordinator
│   ├── StageController.ts   # Manages single stage
│   └── LevelController.ts   # Manages single level/exercise
├── stages/           # Level definitions (content)
│   ├── basic-move.ts
│   ├── capture.ts
│   └── index.ts
└── types/           # TypeScript types
```

## Usage

```typescript
import { LearnController } from '@cotulenh/learn';

const learn = new LearnController();

// Get all stages
const stages = learn.getAllStages();

// Start a stage
learn.selectStage('basic-move');

// Get current level
const stageCtrl = learn.getCurrentStageController();
const level = stageCtrl?.getCurrentLevel();

// Validate moves
const levelCtrl = stageCtrl?.getLevelController();
const result = levelCtrl?.validateMove(move);
```

## Planned Features

- [ ] Complete move validation with @cotulenh/core
- [ ] Terrain-specific levels
- [ ] Deploy/Combine/Recombine tutorials
- [ ] Air defense mechanics
- [ ] Scenario system for interactive lessons
- [ ] Progress persistence (localStorage/backend)
- [ ] Star rating system
- [ ] Hints and feedback messages

## Development

```bash
pnpm install
pnpm run build
pnpm run test
```
