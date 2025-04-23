# CotuLenh Monorepo

This repository contains the CotuLenh project, a modern implementation of Chinese Chess (Xiangqi).

## What's inside?

This Turborepo includes the following packages/apps:

### Apps

- `cotulenh-app`: The main SvelteKit web application for playing CotuLenh.

### Packages

- `cotulenh-board`: A Svelte component library for rendering the Xiangqi board and pieces.
- `cotulenh-core`: Core logic for Xiangqi game rules, move generation, and validation.
- `cotulenh-engine`: AI logic for CotuLenh, including move generation and evaluation.

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo leverages several tools to enhance development:

- [Turborepo](https://turbo.build/repo) for managing the monorepo and build system.
- [TypeScript](https://www.typescriptlang.org/) for static type checking.
- [ESLint](https://eslint.org/) for code linting.
- [Prettier](https://prettier.io) for code formatting.
- [Vitest](https://vitest.dev/) for unit testing.
