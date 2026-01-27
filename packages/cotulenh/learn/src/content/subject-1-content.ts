/**
 * Subject 1: Basic Movement - Introduction Content
 *
 * This file contains the markdown introduction for Subject 1.
 * Separated from lesson definitions for easier content management.
 */

export const subject1Introduction = `
# Welcome to Cotulenh: Basic Movement

Cotulenh is a sophisticated chess variant that combines traditional strategic gameplay with modern military-themed mechanics. Before you can command your army effectively, you must understand how each unit moves.

## The Game Board

Cotulenh is played on an **11×12 board** - larger than a chess board to accommodate the military theater of operations.

**Coordinate System:**
- **Files** (columns): Labeled **a** through **k** from left to right (11 files)
- **Ranks** (rows): Numbered **1** through **12** from bottom to top (12 ranks)
- Each square is identified by file + rank (e.g., e6, h9, c12)

**Key Landmarks:**
- **River**: Divides the board between ranks 6 and 7
- **Bridges**: f6/f7 and h6/h7 - crucial crossing points for heavy units
- **Water Zone**: Files a-b (Navy territory)
- **Coastal Zone**: File c (mixed terrain)
- **Land Zone**: Files d-k (ground operations)

## The 11 Unit Types

Cotulenh features 11 distinct military units, each with unique movement patterns:

### Basic Units (1-square movement)
- **Infantry (I)**: Moves 1 square orthogonally (up, down, left, right). The backbone of your army.
- **Engineer (E)**: Moves 1 square orthogonally. Can carry heavy weapons like Artillery and Missiles.
- **Militia (M)**: Moves 1 square in all 8 directions (including diagonals). More flexible than Infantry.
- **Headquarters (H)**: Immobile - cannot move at all. Protects your Commander and must be defended.
- **Anti-Air (G)**: Moves 1 square orthogonally. Provides crucial air defense coverage.

### Medium-Range Units (2-3 squares)
- **Tank (T)**: Moves up to 2 squares orthogonally. Can carry troops and shoot over obstacles.
- **Missile (S)**: Unique circular pattern - 2 squares orthogonally OR 1 square diagonally. Also provides air defense.

### Long-Range Units (3+ squares)
- **Artillery (A)**: Moves up to 3 squares in all 8 directions. Ignores blocking pieces - can shoot over them!
- **Commander (C)**: Moves unlimited squares orthogonally (like a chess Rook). Your most important piece - if captured, you lose!

### Special Units
- **Air Force (F)**: Flies up to 4 squares in any direction. Ignores terrain and blocking pieces - true mobility!
- **Navy (N)**: Moves up to 4 squares in all directions. Restricted to water zones (files a-c and river squares).

## Movement Terminology

**Orthogonal Movement**: Straight lines only - up, down, left, or right. No diagonals.

**All-Direction Movement**: Can move orthogonally AND diagonally - all 8 directions around a piece.

**Range**: The maximum number of squares a piece can move. A piece can always move fewer squares than its maximum.

**Blocking**: Most pieces cannot pass through other pieces. Exceptions include Artillery, Tank, Missile, Air Force, and Navy.

## Why Movement Matters

Understanding movement is the foundation of all strategy in Cotulenh:
- **Positioning**: Place your pieces where they can threaten enemy units
- **Defense**: Keep your Commander and Headquarters protected
- **Coordination**: Combine different unit types for powerful attacks
- **Terrain Control**: Use the right units for each zone of the board

## What You'll Learn

This subject covers all 11 piece types across three progressive sections:

### Section 1: Basic Unit Movement
Master the foundation with Infantry, Engineer, Militia, Commander, and Headquarters. Learn the differences between orthogonal and all-direction movement.

### Section 2: Medium Range Units
Expand your tactical options with Tanks, Anti-Air, and Missiles. Discover the unique circular pattern of Missiles.

### Section 3: Advanced & Special Units
Harness the power of Artillery (shoots over pieces), Air Force (ignores terrain), and Navy (controls the seas).

## Learning Approach

Each lesson focuses on a single unit type:
1. Read the description to understand the movement pattern
2. Practice by moving the piece to highlighted target squares
3. Experiment freely to build intuition

**Ready to begin? Let's master your army, one unit at a time!**
`;

export const section1BasicUnitsIntro = `
# Basic Unit Movement

In Cotulenh, the simplest units move just 1 square at a time:
- **Infantry** and **Engineer**: Move orthogonally (straight lines)
- **Militia**: Moves in all 8 directions
- **Commander**: Has unlimited orthogonal range
- **Headquarters**: Cannot move (immobile)

These units form the foundation of your army. Learn their movement patterns first!
`;

export const section2MediumRangeIntro = `
# Medium Range Units

These units have more reach than basic units:
- **Tank**: Moves up to 2 squares orthogonally (straight lines)
- **Anti-Air**: Moves 1 square orthogonally (provides air defense)
- **Missile**: Moves in a circular pattern - 2 squares straight or 1 diagonal

They provide tactical flexibility between basic 1-square units and powerful long-range pieces.
`;

export const section3AdvancedUnitsIntro = `
# Advanced & Special Units

These units have powerful movement characteristics:
- **Artillery**: Unlimited orthogonal range, can shoot over blocking pieces
- **Air Force**: Fly over any obstacle with range 4
- **Navy**: Restricted to water zones, 4-square range in all directions

These are your most powerful pieces for controlling the board strategically.
`;
