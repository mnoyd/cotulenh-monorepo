# AI Agent Guide to CoTuLenh Monorepo

This folder contains AI-friendly documentation designed to help AI agents quickly understand the CoTuLenh chess variant system architecture, design patterns, and implementation details.

## Quick Start for AI Agents

1. **System Overview**: Start with `system-architecture.md` for high-level understanding
2. **Data Flow**: Read `data-flow-patterns.md` to understand how information moves through the system
3. **Deploy Sessions**: Review `deploy-session-mechanics.md` for the complex deployment system
4. **Package Roles**: Check `package-responsibilities.md` to understand what each package does
5. **Common Tasks**: See `common-implementation-patterns.md` for typical development tasks

## Documentation Structure

- `system-architecture.md` - High-level system design and component relationships
- `data-flow-patterns.md` - How data flows between packages and components
- `deploy-session-mechanics.md` - Complex deployment system explained
- `package-responsibilities.md` - What each package is responsible for
- `common-implementation-patterns.md` - Typical patterns and how to implement features
- `troubleshooting-guide.md` - Common issues and solutions
- `api-contracts.md` - Interface contracts between packages

## Key Principles

1. **Single Source of Truth**: The core engine (`cotulenh-core`) manages all game logic
2. **Reactive Updates**: UI components react to state changes via FEN updates
3. **Delegation Pattern**: Board UI delegates all logic to core via Svelte app
4. **Virtual State**: Deploy sessions use virtual overlays without mutating base state

## Quick Reference

- **Core Engine**: `packages/cotulenh-core/` - Game logic, rules, state management
- **Board UI**: `packages/cotulenh-board/` - Visual board component (should be "dumb")
- **Demo App**: `apps/cotulenh-app/` - Svelte app connecting board and core
- **Game Flow**: User Action → Board → Svelte App → Core → State Update → UI Refresh
