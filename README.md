# CotuLenh - Commander Chess (Cờ Tư Lệnh)

A modern, open-source implementation of Commander Chess (Xiangqi variant) built with TypeScript and Svelte. This monorepo provides reusable npm packages for building chess applications, along with a full-featured demo application.

## Overview

CotuLenh is a comprehensive chess platform consisting of:

- **Core Logic Engine**: Complete game rules, move validation, and analysis
- **Board UI Component**: Customizable, professional-grade board presentation
- **Demo Application**: Full-featured web app for playing, analyzing games, and solving puzzles

## Features

- ♟ Full Commander Chess rules implementation with complete move validation
- 🎯 Interactive board with piece movement and capture
- 📊 Game analysis and move history tracking
- 🧩 Chess puzzle/quiz mode
- 🎨 Fully customizable board styling and themes
- 📦 Published as npm packages for easy integration
- 🚀 Built with modern TypeScript and Svelte
- ✅ Comprehensive test coverage

## Monorepo Structure

### Packages (Published to NPM)

#### [@repo/cotulenh-core](./packages/cotulenh-core)

Complete game logic engine for Commander Chess.

**Features:**

- Move generation and validation
- Board state management
- Game rule enforcement
- Move history and game analysis
- Puzzle/quiz support

**Use this if you:** Need game rules, validation, and state management without UI.

**Installation:**

```bash
npm install @repo/cotulenh-core
```

#### [@repo/cotulenh-board](./packages/cotulenh-board)

Professional board UI component library built with Svelte.

**Features:**

- Renders interactive chess board with pieces
- Customizable themes and styling
- Move highlighting and validation feedback
- Piece animation and visual feedback
- Asset-based rendering (SVG/Image)
- Works standalone or with cotulenh-core

**Use this if you:** Need a polished board UI for your chess application.

**Installation:**

```bash
npm install @repo/cotulenh-board
```

### Apps

#### [cotulenh-app](./apps/cotulenh-app)

Full-featured demonstration application showcasing both packages working together.

**Features:**

- Play complete games with full rule validation
- Analyze played games with detailed move history
- Solve chess puzzles and quizzes
- Test new features and report bugs
- Responsive web interface built with SvelteKit

**Try it live:** https://cotulenh.netlify.app

## Quick Start

### Playing Games

Visit the [live demo](https://cotulenh.netlify.app) to play immediately without installation.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/mnoyd/cotulenh-monorepo.git
cd cotulenh-monorepo

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

### Using the Packages

#### Basic Game Logic

```typescript
import { Game } from '@repo/cotulenh-core';

const game = new Game();
const moves = game.getValidMoves('a1');
game.move('a1', 'a2');
```

#### Board Component

```svelte
<script>
  import CotuLenhBoard from '@repo/cotulenh-board';
</script>

<CotuLenhBoard
  position={gameState}
  onMove={(from, to) => handleMove(from, to)}
/>
```

## Technology Stack

- **Language:** TypeScript
- **Package Manager:** pnpm
- **Monorepo Tool:** Turborepo
- **Frontend Framework:** Svelte 5 / SvelteKit
- **Build Tool:** Vite
- **Testing:** Vitest
- **Code Quality:** ESLint, Prettier

## Contributing

We welcome contributions! Whether you're reporting bugs, improving documentation, or submitting code improvements:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas to Contribute

- Bug reports and fixes
- Game analysis features
- Performance improvements
- New puzzle types
- UI/UX enhancements
- Documentation improvements

## Development Commands

```bash
# Development
pnpm dev              # Start development server for all packages
pnpm dev --filter=cotulenh-app  # Start only the app

# Building
pnpm build            # Build all packages
pnpm build:app        # Build only the app for production

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm check-types      # Type checking

# Testing
pnpm test             # Run all tests
```

## License

This project is licensed under multiple licenses:

- **cotulenh-core:** BSD-2-Clause
- **cotulenh-board:** GPL-3.0-or-later
- **cotulenh-app:** See individual package licenses

## Authors

- Hoang Manh - Core development

## Resources

- [Game Rules Documentation](./docs/README.md)
- [API Documentation](./packages/cotulenh-core/COTULENH_GAME_MECHANICS.md)
- [Development Guide](./DEBUG_SETUP.md)

## Feedback

- Found a bug? [Open an issue](https://github.com/mnoyd/cotulenh-monorepo/issues)
- Have a feature request? [Start a discussion](https://github.com/mnoyd/cotulenh-monorepo/discussions)
- Want to improve documentation? Contributions welcome!

---

Made with ♟️ for chess enthusiasts and developers
