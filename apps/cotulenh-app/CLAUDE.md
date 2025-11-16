# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` or `npm run dev:debug` (with debugging)
- **Build**: `npm run build` (creates static site in `build/` directory)
- **Preview**: `npm run preview` (preview production build)
- **Type checking**: `npm run check` (one-time) or `npm run check:watch` (continuous)
- **Sync**: `npm run prepare` (syncs SvelteKit)

## Project Architecture

This is a SvelteKit application that implements a chess variant called "CoTuLenh" (Strategic Command). It's part of a monorepo with workspace dependencies.

### Core Architecture Components

**Game Engine Integration**: The app integrates with two workspace packages:

- `@repo/cotulenh-core`: Core game logic, rules, and state management
- `@repo/cotulenh-board`: Visual board component and UI interactions

**State Management**:

- Centralized game state in `src/lib/stores/game.ts` using Svelte stores
- Reactive state updates trigger board re-renders and UI updates
- Deploy sessions track complex multi-step piece deployment moves

**Performance Optimizations**:

- **Lazy loading**: Move generation is done on-demand when pieces are selected, not pre-computed
- **Selective updates**: Board state updates preserve current destinations during ambiguous moves
- Performance logging throughout move handling and state updates

### Key Files and Patterns

**Main Game Logic** (`src/routes/+page.svelte`):

- Handles board initialization and move processing
- Integrates core game engine with visual board component
- Manages deploy sessions (complex multi-piece moves)
- Performance-optimized with lazy move generation

**Game Store** (`src/lib/stores/game.ts`):

- Manages reactive game state (FEN, turn, history, moves)
- Converts between core game types and UI state
- Handles deploy session state transitions

**Component Organization**:

- `src/lib/components/`: Reusable game UI components (controls, panels, info displays)
- `src/routes/board-editor/`: Separate board editing functionality
- Components follow reactive patterns with Svelte 5 runes (`$state`, `$effect`)

### Deploy Sessions

A unique feature allowing complex piece deployments:

- Players can move multiple pieces from a stack in sequence
- UI tracks deployment state with visual highlights
- Sessions can be committed (finalized) or cancelled (reverted)
- Board state automatically updates during deployment steps

### Static Site Generation

- Uses `@sveltejs/adapter-static` for static site deployment
- Builds to `build/` directory
- Configured for SPA mode with fallback routing
- No server-side functionality required

### URL Parameters

- `?fen=<encoded-fen>`: Load game from custom board position
- FEN strings are URL-decoded for custom game states
