#!/usr/bin/env node

/**
 * Extract Piece Assets Script
 *
 * Extracts base64-encoded SVG pieces from commander-chess.pieces.css
 * and saves them as individual SVG files in the static/themes directory.
 */

const fs = require('fs');
const path = require('path');

// Paths
const CSS_FILE = path.join(
  __dirname,
  '../packages/cotulenh/board/assets/commander-chess.pieces.css'
);
const OUTPUT_BASE = path.join(__dirname, '../apps/cotulenh/app/static/themes');

// Theme directories to create
const THEMES = ['modern-warfare', 'classic', 'forest'];

// Piece roles mapping (CSS class names to role names)
const PIECES = {
  air_force: 'air-force',
  anti_air: 'anti-air',
  artillery: 'artillery',
  commander: 'commander',
  engineer: 'engineer',
  headquarter: 'headquarter',
  infantry: 'infantry',
  militia: 'militia',
  missile: 'missile',
  navy: 'navy',
  tank: 'tank'
};

const TEAMS = ['blue', 'red'];

/**
 * Decode base64 data URL to SVG content
 */
function decodeDataUrl(dataUrl) {
  const base64Match = dataUrl.match(/^data:image\/svg\+xml;base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(base64Match[1], 'base64').toString('utf-8');
}

/**
 * Extract piece data from CSS
 */
function extractPiecesFromCSS() {
  const cssContent = fs.readFileSync(CSS_FILE, 'utf-8');
  const pieces = {};

  // Regex to match piece definitions
  const pieceRegex =
    /\.cg-wrap piece\.(\w+)\.(blue|red)[^{]*\{\s*background-image:\s*url\('([^']+)'\);/g;

  let match;
  while ((match = pieceRegex.exec(cssContent)) !== null) {
    const [, role, team, dataUrl] = match;
    const key = `${team}-${role}`;

    try {
      pieces[key] = {
        role,
        team,
        svg: decodeDataUrl(dataUrl)
      };
      console.log(`✓ Extracted ${team} ${role}`);
    } catch (error) {
      console.error(`✗ Failed to extract ${team} ${role}:`, error.message);
    }
  }

  return pieces;
}

/**
 * Create directory structure for themes
 */
function createDirectoryStructure() {
  THEMES.forEach((theme) => {
    TEAMS.forEach((team) => {
      const dir = path.join(OUTPUT_BASE, theme, 'pieces', team);
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    });
  });
}

/**
 * Save SVG files
 */
function savePieces(pieces) {
  THEMES.forEach((theme) => {
    Object.entries(pieces).forEach(([key, data]) => {
      const { role, team, svg } = data;
      const filename = PIECES[role] || role;
      const filepath = path.join(OUTPUT_BASE, theme, 'pieces', team, `${filename}.svg`);

      fs.writeFileSync(filepath, svg, 'utf-8');
      console.log(`Saved: ${filepath}`);
    });
  });
}

/**
 * Main execution
 */
function main() {
  console.log('🎨 Extracting piece assets from CSS...\n');

  // Extract pieces
  const pieces = extractPiecesFromCSS();
  const pieceCount = Object.keys(pieces).length;
  console.log(`\n✓ Extracted ${pieceCount} pieces\n`);

  // Create directories
  console.log('📁 Creating directory structure...\n');
  createDirectoryStructure();

  // Save files
  console.log('\n💾 Saving SVG files...\n');
  savePieces(pieces);

  console.log(`\n✅ Done! Extracted ${pieceCount} pieces to ${THEMES.length} themes`);
  console.log(`\nNext steps:`);
  console.log(`1. Review the extracted SVG files in ${OUTPUT_BASE}`);
  console.log(`2. Customize piece designs for classic and forest themes if needed`);
  console.log(`3. Update theme configs to use the new asset paths`);
}

main();
