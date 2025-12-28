# CotuLenh - Web Application

Full-featured Commander Chess (Cờ Tư Lệnh) web application. Play complete games, analyze your moves, solve puzzles, and test features.

**Live Demo:** https://cotulenh.netlify.app

## Overview

The CotuLenh web app demonstrates how [@repo/cotulenh-core](../../packages/cotulenh-core) and [@repo/cotulenh-board](../../packages/cotulenh-board) work together to create a complete chess experience.

**Features:**

- ♟ Play complete games with full rule validation
- 📊 Analyze games with detailed move history
- 🧩 Solve chess puzzles and quizzes
- 🐛 Test new features and report bugs
- 📱 Responsive design for desktop and mobile
- 🌙 Dark/light theme support
- 💾 Save and load games

## Tech Stack

- **Framework:** [SvelteKit](https://kit.svelte.dev/) 5
- **UI Framework:** [Svelte](https://svelte.dev/) 5
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Game Logic:** [@repo/cotulenh-core](../../packages/cotulenh-core)
- **Board Component:** [@repo/cotulenh-board](../../packages/cotulenh-board)
- **State Management:** [Immer](https://immerjs.github.io/immer/)
- **Language:** TypeScript

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8.15.6+

### Installation & Development

```bash
# From the monorepo root
cd apps/cotulenh-app

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open in browser
# http://localhost:5173
```

### Building for Production

```bash
# From the app directory
pnpm build

# Preview production build locally
pnpm preview
```

## Project Structure

```
cotulenh-app/
├── src/
│   ├── lib/
│   │   ├── components/       # Reusable Svelte components
│   │   ├── stores/          # Svelte stores (game state, etc)
│   │   └── utils/           # Helper functions
│   ├── routes/
│   │   ├── +layout.svelte   # Root layout
│   │   ├── +page.svelte     # Home page
│   │   ├── game/            # Game routes
│   │   ├── puzzle/          # Puzzle routes
│   │   ├── analysis/        # Game analysis routes
│   │   └── board-editor/    # Board editor tool
│   ├── app.css              # Global styles
│   └── app.html             # HTML template
├── static/                  # Static assets
├── package.json
├── svelte.config.js
├── vite.config.ts
└── tailwind.config.js
```

## Available Commands

```bash
# Development
pnpm dev                # Start dev server
pnpm dev --open         # Start and open in browser
pnpm dev:debug          # Start with debug mode

# Building
pnpm build              # Build for production
pnpm preview            # Preview production build

# Code Quality
pnpm check              # Type check, lint, test
pnpm check:watch        # Watch mode for checks

# Testing
pnpm test               # Run tests (if configured)
```

## Features Guide

### Play Games

1. Navigate to the "Play" section
2. Start a new game against the AI or another player
3. Click pieces to select them (highlights valid moves)
4. Drag pieces or click destination to move
5. Game ends when checkmate or stalemate occurs

### Analyze Games

1. Play a game or load a saved game
2. Go to "Analysis" tab
3. View move history with full notation
4. Click on any move to see the board position at that point
5. Get move evaluation and suggestions

### Solve Puzzles

1. Navigate to "Puzzles" section
2. Select a puzzle from the list
3. Find the best sequence of moves
4. Submit your solution
5. View statistics and compare with other players

### Board Editor

1. Go to "Board Editor" tool
2. Click squares to place/remove pieces
3. Set whose turn it is
4. Save the position
5. Load custom positions in games

## Configuration

### Tailwind CSS

Customize colors and styling in `tailwind.config.js`:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        // Custom colors
      }
    }
  }
};
```

### Environment Variables

Create `.env.local` for local configuration:

```bash
VITE_API_URL=http://localhost:3000
VITE_ENABLE_DEBUG=true
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Performance Optimization

The app includes:

- Code splitting and lazy loading
- Image optimization
- CSS purging
- Service worker support for offline play

## Contributing

Contributions are welcome! Here's how to contribute:

1. **Report Bugs:** Found an issue? [Open a bug report](https://github.com/mnoyd/cotulenh-monorepo/issues)
2. **Feature Requests:** Have an idea? [Start a discussion](https://github.com/mnoyd/cotulenh-monorepo/discussions)
3. **Code Contributions:**
   - Fork the repository
   - Create a feature branch
   - Follow the existing code style
   - Submit a pull request

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make your changes
# Commit with clear messages
git commit -m "Add your feature"

# Run checks before pushing
pnpm check

# Push and create a PR
git push origin feature/your-feature
```

## Deployment

The app is deployed to Netlify:

- **Production:** https://cotulenh.netlify.app
- **Builds:** Automatic on push to main branch
- **Configuration:** See `netlify.toml`

### Deploy Your Own

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
pnpm build

# Deploy
netlify deploy --prod
```

## Debugging

### Debug Mode

Start with debug enabled:

```bash
pnpm dev:debug
```

### Browser DevTools

- **Svelte DevTools:** [Get the extension](https://chrome.google.com/webstore/detail/svelte-devtools)
- **Vite DevTools:** [vite-plugin-devtools-json](https://github.com/svitejs/vite-plugin-devtools-json)

### Logging

Enable debug logging in components:

```typescript
const DEBUG = true;
if (DEBUG) console.log('Game state:', gameState);
```

## Common Issues

### Board Not Rendering

- Check that [@repo/cotulenh-board](../../packages/cotulenh-board) is installed
- Verify assets are loaded: check Network tab in DevTools
- Clear browser cache and rebuild

### Game Logic Errors

- Ensure [@repo/cotulenh-core](../../packages/cotulenh-core) is up to date
- Check console for error messages
- Run tests in the core package

### State Management Issues

- Use Vue DevTools for store debugging
- Check Immer immutability violations
- Review store update logic

## Related Packages

- **[@repo/cotulenh-core](../../packages/cotulenh-core)** - Game logic engine
- **[@repo/cotulenh-board](../../packages/cotulenh-board)** - Board UI component
- **[Monorepo](../../)** - Full project

## Testing

```bash
# From monorepo root
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## License

This app is part of the CotuLenh project. See the [main README](../../README.md) for license information.

## Support & Resources

- 📖 [Game Rules](../../docs/README.md)
- 🐛 [Report Issues](https://github.com/mnoyd/cotulenh-monorepo/issues)
- 💬 [Discussions](https://github.com/mnoyd/cotulenh-monorepo/discussions)
- 📚 [Monorepo Docs](../../)

## Roadmap

Planned features:

- [ ] Online multiplayer
- [ ] AI opponent (strength levels)
- [ ] ELO ratings
- [ ] Game database
- [ ] Opening book
- [ ] Endgame tablebase
- [ ] Video tutorials
- [ ] Mobile app (PWA)

## Credits

- **Game Logic:** Implemented from official Commander Chess rules
- **UI Inspiration:** Adapted design patterns from lichess.org
- **Community:** Thanks to all contributors and bug reporters

---

Made with ♟️ for chess enthusiasts
