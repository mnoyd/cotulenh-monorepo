# CotuLenh - Commander Chess (Cờ Tư Lệnh)

A modern TypeScript implementation of Commander Chess (Xiangqi variant). This monorepo provides reusable npm packages and a professional-grade web application.

## Packages

| Package                                        | Description                                                                |
| :--------------------------------------------- | :------------------------------------------------------------------------- |
| [`@cotulenh/core`](./packages/cotulenh/core)   | Game logic engine: move generation, rules, and state management.           |
| [`@cotulenh/board`](./packages/cotulenh/board) | Interactive Svelte board UI with piece animations and customizable themes. |
| [`@cotulenh/app`](./apps/cotulenh/app)         | Reference SvelteKit application showcasing the engine and board.           |

## Demo

Play the live version at [cotulenh-app-demo.netlify.app](https://cotulenh-app-demo.netlify.app/)

## Quick Start

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:5173` to play.

## Usage Example

```typescript
import { CoTuLenh } from '@cotulenh/core';

const game = new CoTuLenh();
const moves = game.generateMoves();
game.move(moves[0]);
```

## Technology Stack

- **Language:** TypeScript
- **Framework:** Svelte 5 / SvelteKit
- **Monorepo:** Turborepo / pnpm
- **Tools:** Vite, Vitest, ESLint, Prettier

## Development

```bash
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint codebase
pnpm check-types  # Type checking
```

## License

- **Core:** BSD-2-Clause
- **Board:** GPL-3.0-or-later
- **App:** Private

## Resources

- [Game Rules](./docs/README.md)
- [Game Mechanics](./packages/cotulenh/core/COTULENH_GAME_MECHANICS.md)
- [Debug Setup](./DEBUG_SETUP.md)
