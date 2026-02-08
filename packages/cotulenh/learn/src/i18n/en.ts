import type { LearnTranslations } from './types';

export const en: LearnTranslations = {
  subjects: {
    'subject-1-basic-movement': {
      subject: {
        title: 'Basic Movement',
        description:
          'Master the movement patterns of all 11 unit types in Cotulenh. From basic 1-square units to unlimited-range pieces.',
        introduction: `# Welcome to Cotulenh: Basic Movement

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

**Ready to begin? Let's master your army, one unit at a time!**`
      },
      sections: {
        'section-1-basic-units': {
          title: 'Basic Unit Movement',
          description:
            'Master the fundamental movement of 1-square units: Infantry, Engineer, Militia, Commander, and Headquarters.',
          introduction: `# Basic Unit Movement

In Cotulenh, the simplest units move just 1 square at a time:
- **Infantry** and **Engineer**: Move orthogonally (straight lines)
- **Militia**: Moves in all 8 directions
- **Commander**: Has unlimited orthogonal range
- **Headquarters**: Cannot move (immobile)

These units form the foundation of your army. Learn their movement patterns first!`
        },
        'section-2-medium-range': {
          title: 'Medium Range Units',
          description:
            'Learn the movement of units with 2-3 square range: Tanks, Anti-Air, and Missiles.',
          introduction: `# Medium Range Units

These units have more reach than basic units:
- **Tank**: Moves up to 2 squares orthogonally (straight lines)
- **Anti-Air**: Moves 1 square orthogonally (provides air defense)
- **Missile**: Moves in a circular pattern - 2 squares straight or 1 diagonal

They provide tactical flexibility between basic 1-square units and powerful long-range pieces.`
        },
        'section-3-advanced-units': {
          title: 'Advanced & Special Units',
          description:
            'Master the powerful units: Artillery (unlimited orthogonal), Air Force (long range), and Navy (water-based).',
          introduction: `# Advanced & Special Units

These units have powerful movement characteristics:
- **Artillery**: Unlimited orthogonal range, can shoot over blocking pieces
- **Air Force**: Fly over any obstacle with range 4
- **Navy**: Restricted to water zones, 4-square range in all directions

These are your most powerful pieces for controlling the board strategically.`
        }
      },
      lessons: {
        'bm-1-1': {
          title: 'Infantry Movement',
          description: 'The Infantry is a basic ground unit that moves 1 square orthogonally.',
          content: `## Infantry

- Moves **1 square orthogonally** (up, down, left, right).
- Operates on **land zones** (files d-k), with access to mixed zones on the c-file and river banks.
- Reliable, simple movement makes Infantry ideal for learning fundamentals.`,
          instruction:
            'Click that Infantry and move to any valid square (highlighted). Infantry moves 1 square orthogonally (up, down, left, right).',
          hint: 'Try moving the Infantry straight up, down, left, or right - but only 1 square at a time.',
          successMessage: 'Perfect! Infantry moves 1 square orthogonally.'
        },
        'bm-1-2': {
          title: 'Engineer Movement',
          description:
            'Engineers are support units with the same movement as Infantry - 1 square orthogonally.',
          content: `## Engineer

- Moves **1 square orthogonally**, just like Infantry.
- Stays on **land zones**, using mixed zones as shared terrain.
- Often supports other units in combined operations.`,
          instruction:
            'Move the Engineer to any valid square. Engineers move 1 square orthogonally.',
          hint: 'Engineers move exactly like Infantry - straight lines, 1 square at a time.',
          successMessage: 'Excellent! Engineers share the same movement as Infantry.'
        },
        'bm-1-3': {
          title: 'Militia Movement',
          description:
            'Militia units are versatile and can move in all 8 directions, 1 square at a time.',
          content: `## Militia

- Moves **1 square in any direction** (orthogonal + diagonal).
- Remains a **land unit**, limited to land and mixed zones.
- Flexible angles make it great for quick tactical adjustments.`,
          instruction:
            'Move the Militia. Militia can move in all directions - orthogonally AND diagonally.',
          hint: 'Militia is more flexible than Infantry. Try moving diagonally as well as straight.',
          successMessage: 'Great! Militia moves in all 8 directions, 1 square at a time.'
        },
        'bm-1-4': {
          title: 'Commander Movement',
          description:
            'The Commander is a special piece that moves unlimited squares orthogonally but only 1 square to capture.',
          content: `## Commander

- Moves **any distance orthogonally** (rook-like movement).
- Captures **only adjacent squares** in base form.
- Keep it safe — losing the Commander ends the game.`,
          instruction:
            'Move the Commander. The Commander can move unlimited squares orthogonally (like the Rook in chess).',
          hint: 'Try moving the Commander all the way to the top or bottom of the board in one move.',
          successMessage:
            'Well done! The Commander has unlimited orthogonal movement - a powerful tactical piece.'
        },
        'bm-1-5': {
          title: 'Headquarters',
          description: 'Headquarters is an immobile piece - it cannot move on the board.',
          content: `## Headquarters

- **Immobile** in its base form (cannot move or capture).
- Must be **carried in a stack** or become heroic to move.
- Protect it as a key strategic asset.`,
          instruction:
            'The Headquarters cannot move. Click on it or any square to complete the lesson.',
          hint: 'Headquarters represents your command structure - it stays in place to defend.',
          successMessage:
            'Correct! Headquarters is immobile - an important strategic asset to protect.'
        },
        'bm-2-1': {
          title: 'Tank Movement',
          description: 'Tanks are armored units that move up to 2 squares orthogonally.',
          content: `## Tank

- Moves **1–2 squares orthogonally**.
- Strong mid-range mobility for ground control.
- Later lessons cover its ability to **shoot over blockers**.`,
          instruction:
            'Move the Tank. Tanks move up to 2 squares orthogonally - they can move 1 or 2 squares, but not 3 or more.',
          hint: 'Think of the Tank like a more mobile Infantry. It can move 1 or 2 squares in straight lines.',
          successMessage:
            'Excellent! Tanks can move 1 or 2 squares orthogonally, giving them more tactical flexibility.'
        },
        'bm-2-2': {
          title: 'Anti-Air Movement',
          description: 'Anti-Air units move 1 square orthogonally and provide air defense.',
          content: `## Anti-Air

- Moves **1 square orthogonally**.
- Creates a **1-square air defense zone** around it.
- A key defender against Air Force threats.`,
          instruction:
            'Move the Anti-Air unit. Like Infantry, Anti-Air units move 1 square orthogonally.',
          hint: 'Anti-Air movement is identical to Infantry - straight lines, 1 square at a time.',
          successMessage:
            'Good! Anti-Air units move like Infantry, but provide crucial air defense.'
        },
        'bm-2-3': {
          title: 'Missile Movement',
          description:
            'Missiles have a unique circular movement pattern: 2 squares orthogonally or 1 square diagonally.',
          content: `## Missile

- Moves **up to 2 squares orthogonally**.
- Moves **1 square diagonally** (a compact circular reach).
- Projects a **2-square air defense zone**.`,
          instruction:
            'Move the Missile. Missiles have a circular reach pattern: up to 2 squares straight OR 1 square diagonal.',
          hint: 'Imagine a circle around the Missile - it can reach the outer edges of that circle.',
          successMessage:
            'Perfect! Missiles have a unique circular reach - useful for varied tactical positioning.'
        },
        'bm-3-1': {
          title: 'Artillery Movement',
          description:
            'Artillery can move unlimited squares orthogonally, ignoring blocking pieces.',
          content: `## Artillery

- Moves **any distance orthogonally**.
- **Heavy unit**: must use **bridge squares** to cross the river.
- Later lessons cover long-range capture rules.`,
          instruction:
            'Move the Artillery. Artillery can move any number of squares orthogonally, like the Rook in chess. It can shoot over obstacles!',
          hint: 'Think of Artillery as a long-range unit. It can move across the entire board in straight lines.',
          successMessage:
            'Excellent! Artillery has unlimited orthogonal range - a powerful ranged unit.'
        },
        'bm-3-2': {
          title: 'Air Force Movement',
          description:
            'Air Force units can fly to any LAND square within range 4, ignoring terrain and other pieces.',
          content: `## Air Force

- Flies **up to 4 squares** in any direction.
- **Ignores terrain and blocking**, but can only **land on land zones**.
- Subject to enemy **air defense zones**.`,
          instruction:
            'Move the Air Force. Air Force can reach any land square within distance 4, ignoring obstacles!',
          hint: 'Air Force has great mobility (range 4) and ignores obstacles, but cannot land on water (files a-b).',
          successMessage: 'Amazing! Air Force is a versatile unit with high mobility and range.'
        },
        'bm-3-3': {
          title: 'Navy Movement',
          description:
            'Navy units move in water zones (files a-b and coastal areas). They have 4-square range in all directions.',
          content: `## Navy

- Moves **up to 4 squares** in any direction.
- Restricted to **navy zones** (files a-c and river squares).
- Can navigate congested waters by **ignoring blocking**.`,
          instruction:
            'Move the Navy ship. Navy can only move in water zones: files a-b and the coastal c-file. It has a 4-square range in all directions within these zones.',
          hint: "Navy is restricted to water. Look at files a, b, and c - that's where Navy operates.",
          successMessage:
            'Well done! Navy controls the water zones - essential for naval dominance and strategic defense.'
        }
      }
    },
    'subject-2-terrain': {
      subject: {
        title: 'Terrain',
        description: 'Learn water, land, river crossings, and mixed zones.',
        introduction: `# Terrain in Cotulenh

![Terrain Guide](custom:terrain-guide)

The Cotulenh battlefield is not a uniform playing field. Terrain shapes every tactical decision, determining where your units can operate and how they must maneuver to achieve objectives.

## The Terrain System

The 11×12 board is divided into distinct operational zones that simulate different environments - from open seas to contested coastlines to inland territory.

### Water Zones (Files a-b)

![Water and Coastal Zones](/learn/subject-2/water-coastal-map.svg)

**Pure Water** occupies the two leftmost files of the board:
- Only **Navy** and **Air Force** can operate here
- Land units cannot enter - attempting to do so is an illegal move
- Navy pieces dominate this zone with their 4-square range

**Strategic Importance**: Control of water zones protects your flank and enables naval operations along the coast.

### Coastal/Mixed Zones (File c + River Squares)

**Mixed Terrain** allows both water and land operations:
- **File c** (entire column) - the coastal interface
- **River squares**: d6, e6, d7, e7 - where the river meets mixed terrain

**Who Can Operate Here**:
- Navy can patrol these waters
- Land units can access the coast
- Creates contested zones where different unit types interact

**Strategic Importance**: Mixed zones are often battlegrounds where naval and ground forces clash.

### Land Zones (Files d-k)

**Pure Land** covers most of the board:
- All ground units operate freely here
- Navy cannot enter these zones
- Air Force can fly over at will

**Strategic Importance**: This is where most ground combat occurs. Position your infantry, tanks, and artillery effectively.

### The River (Between Ranks 6 and 7)

![River and Bridges](custom:bridge-detail)

The **river** divides the board into northern and southern territories:
- Runs horizontally across the entire board
- Creates a natural defensive barrier
- Different units have different crossing abilities

**Crossing Rules**:
- **Light units** (Infantry, Militia, Tank, Commander): Can cross the river freely
- **Heavy units** (Artillery, Anti-Air, Missile): MUST use bridge squares f6/f7 or h6/h7
- **Air Force**: Flies over - no restrictions
- **Navy**: Can access river squares d6, e6, d7, e7 (mixed zones)

### Bridge Squares (f6/f7 and h6/h7)

**Bridges** are critical chokepoints for heavy unit movement:
- Located at f6/f7 (western bridge) and h6/h7 (eastern bridge)
- Heavy pieces MUST route through these squares to cross the river
- Control of bridges can trap enemy heavy units on one side

**Strategic Importance**: Blocking or controlling bridges limits enemy heavy artillery mobility.

## Terrain by Unit Type

**Navy**: Water (a-b) Yes, Coastal Yes, River Yes, Land No

**Infantry**: Water No, Coastal Yes, River No, Land Yes

**Tank**: Water No, Coastal Yes, River Cross freely, Land Yes

**Artillery**: Water No, Coastal Yes, River Bridge only, Land Yes

**Air Force**: Water Yes, Coastal Yes, River Yes, Land Yes (ignores all terrain!)

**Commander**: Water No, Coastal Yes, River Cross freely, Land Yes

## Why Terrain Matters

**Movement Planning**: You must consider terrain before every move. A Tank on e5 cannot reach b5 directly - the water blocks it.

**Strategic Positioning**: Place Navy where it controls water zones. Position Artillery where it can reach targets without needing to cross the river.

**Defensive Advantage**: Use terrain to protect your pieces. Navy in water zones is safe from most ground attacks.

**Combined Arms**: Coordinate different unit types. Use Air Force to strike where ground units cannot reach.

## What You'll Learn

In this subject, you'll master terrain through hands-on practice:
- Navigate water zones with Navy
- Understand where land units can and cannot go
- Cross the river with light and heavy units
- Use bridges strategically
- Exploit mixed zones for tactical advantage

**Terrain mastery separates novice commanders from experts. Let's begin!**`
      },
      sections: {
        'section-1-terrain-basics': {
          title: 'Terrain Basics',
          description: 'Learn water, land, river crossings, and mixed zones.',
          introduction: `# Terrain Basics

![Terrain Guide](custom:terrain-guide)

Terrain controls where each unit can operate. Understanding terrain restrictions is essential for valid movement and strategic positioning.

## Quick Reference

**Pure Water (a, b)**: Navy and Air Force only

**Mixed/Coastal (c, d6, e6, d7, e7)**: Navy AND Land units

**Land (d-k except river)**: All land units

**Bridge (f6/f7, h6/h7)**: Heavy units cross here

## Key Rules

- **Navy** is water-bound - it cannot enter pure land zones
- **Land units** cannot enter pure water zones (files a-b)
- **Heavy units** (Artillery, Anti-Air, Missile) need bridges to cross the river
- **Air Force** ignores all terrain - it can go anywhere!

These lessons teach each rule through hands-on practice.`
        }
      },
      lessons: {
        'terrain-1': {
          title: 'Water vs Land',
          description: 'Learn which squares belong to water and land zones.',
          content: `## Water vs Land

- **Navy zones**: files **a-b** plus coastal **c-file** access.
- **Land zones**: files **d-k**.
- **Mixed zones** (c-file and river squares) allow both Navy and Land units.`,
          instruction:
            'Terrain splits the board into water and land. Navy ships stay on water (files a-c), while land units stay on land (files d-k). Move the Navy to the water targets and the Tank to the land targets.',
          hint: 'Use the Navy for a/b-file targets and the Tank for d-k targets.',
          successMessage: 'Great! Water is for Navy, land is for ground units.'
        },
        'terrain-2': {
          title: 'The River and Bridges',
          description: 'Cross the river with a Tank and use bridges for Artillery.',
          content: `## River and Bridges

- The river sits **between ranks 6 and 7**.
- **Tanks** can cross normally.
- **Heavy units** (Artillery/Anti-Air/Missile) must use **bridge squares**: f6/f7 or h6/h7.`,
          instruction:
            'The river runs between ranks 6 and 7. Tanks can cross it, but heavy Artillery must use bridge squares (f6/f7 or h6/h7). Move the Tank across the river and move the Artillery onto bridge squares.',
          hint: 'Tank to e7 works. Artillery should visit f6 and f7.',
          successMessage: 'Nice! Tanks can cross the river, but Artillery needs bridges.'
        },
        'terrain-3': {
          title: 'Mixed Zones',
          description: 'Practice squares that both Navy and Land units can use.',
          content: `## Mixed Zones

- The **c-file** and **river squares** are shared terrain.
- Both **Navy** and **Land** units can move through these squares.
- Use mixed zones to transition between water and land operations.`,
          instruction:
            'Mixed zones are shared terrain: the c-file and the river squares. Both Navy and Land units can move there. Reach all the mixed-zone targets.',
          hint: 'Use either piece to visit the c-file and river squares.',
          successMessage: 'Perfect! Mixed zones are shared by Navy and Land.'
        }
      }
    },
    'subject-3-capture': {
      subject: {
        title: 'Capture',
        description: 'Learn normal capture, stay capture, and special capture cases.',
        introduction: `# Capture in Cotulenh

Capturing enemy pieces is fundamental to victory. In Cotulenh, you can remove enemy units through several distinct capture mechanics, each with tactical implications.

## Normal Capture (Move Capture)

The most common capture type - identical to chess:
- Move your piece onto a square occupied by an enemy piece
- The enemy piece is removed from the board
- Your piece now occupies that square

**All pieces** can perform normal captures within their movement range.

**Example**: An Infantry on e4 can capture an enemy piece on e5 by moving there.

## Stay Capture (Ranged Attack)

Some units can **destroy enemies without moving** - a ranged attack:
- The attacking piece remains on its original square
- The target piece is destroyed
- The target square becomes empty

**Units with Stay Capture**:
- **Artillery**: Can stay-capture within its 3-square range
- **Air Force**: Can stay-capture within its 4-square range
- **Navy**: Can stay-capture within its 4-square range
- **Missile**: Can stay-capture within its range pattern

**Tactical Advantage**: Stay captures let you eliminate threats while maintaining your position. Your piece doesn't become exposed by moving forward.

## Suicide Capture (Mutual Destruction)

In rare cases, both the attacker and defender are destroyed:
- **Air Force Kamikaze**: Air Force can perform suicide attacks in certain situations
- **Commander Exposure**: When commanders face each other on a clear file/rank, both are captured

## Capture Ranges vs Movement Ranges

Some pieces have **different ranges for capture vs movement**:

**Commander**: Moves unlimited squares, but captures only 1 square adjacent

**Heroic Commander**: Moves unlimited, captures up to 2 squares

**All other units**: Move and capture ranges are identical

This means the Commander is powerful for mobility but must get close to capture.

## Blocking and Line of Sight

**Most pieces** cannot capture through other pieces:
- Infantry, Militia, Tank, Commander, Engineer, Headquarters
- They need a clear path to the target

**Pieces that ignore blocking**:
- **Artillery**: Shoots over intervening pieces
- **Tank**: Can shoot over blocking pieces
- **Missile**: Can shoot over blocking pieces
- **Air Force**: Flies over everything
- **Navy**: Shoots over blocking pieces

**Tactical Implication**: Use blocking units to protect high-value targets from direct capture.

## Capture and Terrain

Capture follows terrain rules:
- **Navy** cannot capture pieces in pure land zones (cannot reach them)
- **Land units** cannot capture pieces in pure water zones
- **Air Force** can capture anywhere (ignores terrain)
- **Heavy units** must respect bridge requirements even for captures

## Special Capture Cases

### Air Defense Interception
If an Air Force attempts to move through or into a square covered by enemy air defense (Anti-Air or Missile), it may be destroyed before completing its move.

### Commander Capture
Capturing the enemy Commander immediately wins the game - equivalent to checkmate.

### Stack Capture
When capturing a piece stack, you capture the **entire stack** (carrier plus all carried pieces).

## Heroic Status and Capture

**Heroic pieces** have enhanced capture abilities:
- Increased capture range for most units
- Infantry: 1 → 2 squares
- Tank: 2 → 3 squares
- Commander: 1 → 2 squares
- And similar enhancements for other units

## Strategic Capture Principles

**Material Advantage**: Each captured piece weakens your opponent. Trade wisely.

**Piece Value**: Not all pieces are equal. Protect your Commander and high-value units.

**Position vs Material**: Sometimes controlling key squares is worth sacrificing a piece.

**Tempo**: Captures that also improve your position are doubly valuable.

## What You'll Learn

This subject covers capture mechanics through practical exercises:
- Execute normal captures with various pieces
- Perform stay captures with Artillery and Air Force
- Understand capture ranges and blocking
- Capture across different terrain zones
- Master special capture situations

**Combat is the heart of strategy. Master these captures to dominate the battlefield!**`
      },
      sections: {
        'section-1-capture-basics': {
          title: 'Capture Basics',
          description: 'Learn normal capture, stay capture, and special capture cases.',
          introduction: `# Capture Basics

Capturing removes enemy pieces from the board. Cotulenh features multiple capture styles:

## Capture Types Overview

**Normal Capture**: Move onto enemy square - all units can do this

**Stay Capture**: Destroy target without moving - Artillery, Air Force, Navy, Missile

**Suicide Capture**: Both pieces destroyed - Air Force (kamikaze)

## Key Concepts

- **Capture Range**: Some pieces have different capture ranges than movement ranges (e.g., Commander)
- **Blocking**: Most pieces cannot capture through other pieces; some exceptions exist
- **Terrain**: Capture follows the same terrain rules as movement

Each lesson teaches one capture mechanic through practice.`
        }
      },
      lessons: {
        'capture-1': {
          title: 'Normal Capture',
          description: 'Capture by moving onto an enemy piece.',
          content: `## Normal Capture

- Capture by **moving onto** an enemy piece.
- Your unit replaces the enemy on that square.
- Standard rule for most pieces and situations.`,
          instruction:
            'Normal capture means you move onto the enemy square. Capture the enemy directly above you.',
          hint: 'Move the Infantry from e5 to e6 to capture.',
          successMessage: 'Nice! Normal captures replace the enemy on its square.'
        },
        'capture-2': {
          title: 'Stay Capture',
          description: 'Destroy a target without leaving your square.',
          content: `## Stay Capture

- Some units (like **Artillery**) can **destroy a target without moving**.
- The attacker stays in place while the enemy is removed.
- Useful for holding key positions while striking.`,
          instruction:
            'Stay capture destroys the target but the attacker stays. Use Artillery to destroy the target on d5 without moving.',
          hint: 'Choose the stay-capture option when you attack the target square.',
          successMessage: 'Perfect! Stay captures remove the enemy while you hold position.'
        },
        'capture-3': {
          title: 'Capture Across the River',
          description: 'Artillery can capture across the river.',
          content: `## Capture Across the River

- The river divides ranks **6** and **7**.
- **Artillery** can capture across the river when in range.
- Heavy units still need **bridges** to *move* across.`,
          instruction:
            'The river divides ranks 6 and 7. Artillery can cross and capture across it. Capture the enemy at j8.',
          hint: 'From j5, move the Artillery two squares to j8.',
          successMessage: 'Great! The Artillery crossed the river to capture.'
        },
        'capture-4': {
          title: 'Air Force Capture',
          description: 'Air Force captures using its long-range flight.',
          content: `## Air Force Capture

- Air Force captures **within flight range**.
- It **ignores terrain and blocking** while flying.
- Be mindful of **air defense zones**.`,
          instruction:
            'Air Force can capture within its flight range, ignoring terrain and blocking. Capture the target on f8.',
          hint: 'Move the Air Force straight up to f8 to capture.',
          successMessage: 'Excellent! Air Force captures from long range.'
        }
      }
    },
    'subject-4-blocking': {
      subject: {
        title: 'Blocking Mechanism',
        description: 'Learn which pieces can move or capture through other pieces.',
        introduction: `# Blocking Mechanism in Cotulenh

Understanding which pieces can move or capture through other pieces is crucial for mastering Cotulenh tactics. Different pieces have different blocking rules for movement and capture.

## Pieces Blocked by Others (Movement AND Capture)

These pieces cannot move or capture through intervening pieces:
- **Infantry**: Blocked in all directions
- **Militia**: Blocked in all directions
- **Commander**: Blocked in all directions (despite infinite movement range)
- **Engineer**: Blocked in all directions
- **Headquarters**: Blocked (when heroic and able to move)
- **Anti-Air**: Blocked in all directions

## Pieces That Ignore Blocking

Some pieces can move and/or capture through intervening pieces:

### Tank - Blocked Movement, Unblocked Capture
- **Movement**: BLOCKED - Cannot move through other pieces
- **Capture**: UNBLOCKED - Can shoot over pieces to capture ("Shoot Over Blocking")

### Artillery - Blocked Movement, Unblocked Capture
- **Movement**: BLOCKED - Cannot move through other pieces
- **Capture**: UNBLOCKED - Can shoot over pieces to capture

### Missile - Blocked Movement, Unblocked Capture
- **Movement**: BLOCKED - Cannot move through other pieces
- **Capture**: UNBLOCKED - Can shoot over pieces to capture

### Air Force - Ignores All Blocking
- **Movement**: UNBLOCKED - Flies over all pieces
- **Capture**: UNBLOCKED - Can attack through any pieces

### Navy - Ignores All Blocking
- **Movement**: UNBLOCKED - Can move through other pieces
- **Capture**: UNBLOCKED - Can attack through other pieces

## Strategic Implications

**Defensive Screens**: Place pieces in front of your Commander or high-value units. Most enemies cannot reach through your defensive line.

**Ranged Attacks**: Tank, Artillery, and Missile can eliminate threats behind enemy lines by shooting over blocking pieces.

**Air Superiority**: Air Force ignores all blocking, making it devastating against protected positions.

**Naval Flexibility**: Navy pieces can navigate through congested water zones freely.

## Blocking Summary Table

| Piece Type   | Movement Blocked? | Capture Blocked? |
|--------------|-------------------|------------------|
| Infantry     | Yes               | Yes              |
| Militia      | Yes               | Yes              |
| Commander    | Yes               | Yes              |
| Engineer     | Yes               | Yes              |
| Anti-Air     | Yes               | Yes              |
| Headquarters | Yes               | Yes              |
| Tank         | Yes               | **No**           |
| Artillery    | Yes               | **No**           |
| Missile      | Yes               | **No**           |
| Air Force    | **No**            | **No**           |
| Navy         | **No**            | **No**           |

## What You'll Learn

This subject teaches blocking mechanics through practical exercises:
- Experience blocked movement with Infantry
- Use Tank to shoot over blockers
- Deploy Artillery for long-range strikes through lines
- Master Air Force's ability to bypass all obstacles
- Navigate Navy through crowded waters

**Understanding blocking is the key to both offense and defense!**`
      },
      sections: {
        'section-1-block-movement': {
          title: 'Block Movement',
          description: 'Learn how pieces are blocked from moving by obstacles.',
          introduction: `# Blocked Pieces

Most pieces in Cotulenh cannot move or capture through other pieces. This creates tactical opportunities for defense and controlling space.

## Key Concepts

- **Movement Blocking**: A piece in the path stops you from moving through
- **Capture Blocking**: A piece in the path stops you from capturing beyond it
- **Line of Sight**: You need a clear path to reach your destination

Learn how blocking affects different pieces through these exercises.`
        },
        'section-2-blocking-capture': {
          title: 'Blocking Capture',
          description: 'Learn how pieces interact with blocking when capturing.',
          introduction: `# Pieces That Ignore Blocking

Some pieces have special abilities that let them bypass blocking:

## Shoot Over Blocking (Capture Only)
- **Tank**: Can shoot over pieces to capture
- **Artillery**: Can shoot over pieces to capture
- **Missile**: Can shoot over pieces to capture

## Full Ignore Blocking (Move and Capture)
- **Air Force**: Flies over everything
- **Navy**: Moves freely through other pieces

Master these abilities to break through enemy defenses!`
        }
      },
      lessons: {
        'blocking-1': {
          title: 'Tank Is Blocked',
          description: 'Tank cannot move through other pieces.',
          content: `## Movement Blocking

- Most ground units **cannot move through pieces**.
- The Tank must stop before a blocking piece.
- Plan around blockers to keep lanes open.`,
          instruction:
            'The Tank on e4 is blocked by the friendly Infantry on e5. Try moving it forward - you can only go to e5 if captured, but you cannot pass through.',
          hint: 'Move the Tank on e4 sideways to d4 or f4 since forward is blocked.',
          successMessage: 'Correct! Tank must go around blocking pieces.'
        },
        'blocking-2': {
          title: 'Artillery Is Blocked',
          description: 'Artillery cannot move through other pieces.',
          content: `## Artillery Movement

- Artillery moves far, but **cannot pass through blockers**.
- It needs a clear line for movement.
- Later lessons show how it can **capture through blockers**.`,
          instruction:
            'The Artillery on e4 is blocked by the friendly Infantry on e5. Even though it is a long range unit, it cannot move through pieces.',
          hint: 'Move the Artillery sideways to d4 or f4.',
          successMessage: 'Good! Artillery needs an open path to move.'
        },
        'blocking-3': {
          title: 'Commander Blocked Despite Range',
          description: 'Even the Commander with infinite range cannot pass through pieces.',
          content: `## Commander Blocking

- The Commander has **infinite range**.
- It still **cannot move through pieces**.
- Keep lanes clear if you need long-range movement.`,
          instruction:
            'The Commander has unlimited movement range but cannot move through the Infantry at e7. Move the Commander sideways or backwards.',
          hint: 'The Commander can move to d5, f5, or any empty square not blocked by Infantry.',
          successMessage: 'Right! Even the Commander respects blocking.'
        },
        'blocking-3a': {
          title: 'Navy Coast Movement',
          description: 'Navy can pass land on coast but is blocked by other navy.',
          content: `## Navy on the Coast

- Navy ignores **land pieces** along the coast.
- It **is blocked by other Navy** in water.
- Use coastal lanes to slip past land congestion.`,
          instruction:
            'The Navy at a4 can move north past the land Infantry at c6 (coastal land does not block navy), but IS blocked by the friendly Navy at a8. Move the Navy on a4 sideways since forward is blocked.',
          hint: 'Navy on water is blocked by other navy, not by land pieces on coast. Move sideways to b4.',
          successMessage: 'Correct! Navy is blocked by other ships, not land pieces on the coast.'
        },
        'blocking-4': {
          title: 'Tank Shoots Over Blockers',
          description: 'Tank cannot move through pieces AND cannot shoot over them.',
          content: `## Shooting Over Blockers

- Tanks **cannot move through** pieces.
- Tanks **cannot capture through** a single blocking piece.
- This lets Tanks punish stacked defenses.`,
          instruction:
            'The Tank at e4 cannot move through the friendly Infantry at e5, and it CANNOT capture the enemy at e7 by shooting over the blocker.',
          hint: 'Select the Tank and capture the enemy infantry at e7.',
          successMessage: 'Excellent! Tank move around to capture.'
        },
        'blocking-5': {
          title: 'Artillery Long-Range Strike',
          description: 'Artillery ignores blocking for captures.',
          content: `## Artillery Strike

- Artillery **ignores blocking** when capturing.
- Long-range shots can pass over friendly pieces.
- Great for breaking defensive lines.`,
          instruction:
            'Artillery at e4 can capture the enemy at e8 despite the friendly Infantry at e6. Shoot over the blocker!',
          hint: 'Artillery range is 3 squares and ignores blocking for capture.',
          successMessage: 'Perfect! Artillery strikes through defensive lines.'
        },
        'blocking-6': {
          title: 'Air Force Flies Over All',
          description: 'Air Force ignores all blocking for both movement AND capture.',
          content: `## Air Force Overflight

- Air Force **ignores all blocking** for movement and capture.
- It can fly over friendly and enemy pieces alike.
- Only air defense zones can stop it.`,
          instruction:
            'Air Force at f6 can fly over both friendly Infantry pieces to capture the enemy at f9. Air ignores all blocking!',
          hint: 'Select Air Force and capture the enemy at f9.',
          successMessage: 'Outstanding! Air Force bypasses all ground obstacles.'
        },
        'blocking-7': {
          title: 'Navy Moves Through Pieces',
          description: 'Navy can move and capture through other pieces in water.',
          content: `## Navy Navigation

- Navy **ignores blocking** in water.
- It can move and capture through other ships.
- Powerful for lane control on files a-c.`,
          instruction:
            'The Navy at a6 can move through the friendly Navy at a8 to capture the enemy at a4. Navy ignores blocking.',
          hint: 'Select the Navy at a6 and capture at a4.',
          successMessage: 'Excellent! Navy navigates freely through congested waters.'
        },
        'blocking-8': {
          title: 'Missile Shoots Over',
          description: 'Missile can capture through blocking pieces.',
          content: `## Missile Capture

- Missiles **capture through blockers**.
- Movement is still blocked by pieces.
- Use missiles to pick off protected targets.`,
          instruction:
            'The Missile at e4 can shoot over the friendly Infantry at e5 to capture the enemy at e7.',
          hint: 'Missile range is 2 and ignores blocking for capture.',
          successMessage: 'Great! Missile strikes through obstacles.'
        }
      }
    },
    'subject-5-air-defense': {
      subject: {
        title: 'Air Defense',
        description: 'Navigate air defense zones and execute kamikaze captures.',
        introduction: `# Air Defense in Cotulenh

Air Defense creates invisible danger zones that restrict Air Force movement. Learning these zones is essential for safe flight paths and effective strikes.

## Who Provides Air Defense

- **Anti-Air (G/g)**: Range 1
- **Missile (S/s)**: Range 2
- **Navy (N/n)**: Range 1

Heroic versions extend their air defense range by 1.

## What Happens in Defense Zones

When Air Force moves through enemy air defense coverage:

- **Safe Pass**: No defense encountered → move normally
- **Kamikaze**: Enter a single defense zone → move completes, Air Force is destroyed
- **Destroyed**: Enter multiple zones or exit then re-enter → move is blocked

## Tactical Implications

- **Plan flight paths** to avoid defended squares
- **Accept sacrifices** when a kamikaze strike is worth the target
- **Layer defenses** to deny Air Force access entirely

## What You'll Learn

- Navigate Air Force around air defense coverage
- Identify safe routes to multiple objectives
- Execute a kamikaze capture and see the Air Force removed

Master air defense to control the skies.`
      },
      sections: {
        'section-1-avoid-air-defense': {
          title: 'Avoiding Air Defense',
          description: 'Learn how to route Air Force around defended squares.',
          introduction: `# Avoiding Air Defense Zones

Air defense coverage is invisible, but it controls space. Your Air Force must route around protected squares to survive.

Use the targets to practice safe movement around defended areas.`
        },
        'section-2-kamikaze': {
          title: 'Kamikaze Capture',
          description: 'Execute a suicide capture through a single defense zone.',
          introduction: `# Kamikaze Captures

If Air Force enters exactly one enemy air defense zone, it can complete its attack but is destroyed afterward.

These lessons demonstrate a successful kamikaze capture and its outcome.`
        }
      },
      lessons: {
        'air-defense-1': {
          title: 'Avoid Air Defense Zones',
          description: 'Navigate the Air Force around missile coverage to reach multiple targets.',
          content: `## What is Air Defense?

**Missiles** create a protective zone that threatens enemy aircraft. Any **Air Force** flying through this zone will be destroyed!

### The Defense Zone

- The missile defends **all adjacent squares** (including diagonals)
- The zone is shown by the **purple highlighted area** on the board
- Your Air Force cannot safely pass through these squares

### Strategy

To complete this lesson, you must:
1. Navigate **around** the danger zone
2. Reach both target squares

> **Tip:** Always check for missiles before planning your Air Force route!`,
          instruction:
            'Move the Air Force to d5 and d7. Avoid the missile air defense zone centered on f6.',
          hint: 'Use the d-file to avoid the missile zone around f6.',
          successMessage: 'Great! You reached both targets while staying out of air defense.'
        },
        'air-defense-2': {
          title: 'Kamikaze Capture',
          description: 'Air Force can sacrifice itself when passing through a single defense zone.',
          content: `## The Kamikaze Strike

Sometimes, the only way to neutralize an air defense is through **sacrifice**.

### How Kamikaze Works

When your Air Force flies through **exactly one** missile's defense zone to capture it:
- The Air Force **captures the missile**
- But then the Air Force is **also destroyed**
- Both pieces are removed from the board

### When to Use This Tactic

Kamikaze is valuable when:
- The missile is blocking a critical attack route
- You have more aircraft than the enemy has missiles
- Removing the defense opens up your other pieces

> **Warning:** If the enemy has *multiple* missiles covering the same square, kamikaze won't work — your Air Force will be shot down before reaching the target!`,
          instruction:
            'Capture the Anti-Air on e5. The Air Force will be destroyed after the attack.',
          hint: 'Fly straight up from e1 to e5 to trigger a kamikaze capture.',
          successMessage: 'Confirmed: both units are removed after the kamikaze strike.'
        }
      }
    },
    'subject-6-combine-piece': {
      subject: {
        title: 'Combine Pieces',
        description: 'Form stacks using the official combination blueprints.',
        introduction: `# Combining Pieces in Cotulenh

Cotulenh lets friendly units stack on the same square to form **combined pieces**. A stack moves as one unit, with a single **carrier** transporting the others.

## Core Rules

- Only **same-color** pieces can combine
- The **carrier** determines movement and terrain restrictions
- Carrier is chosen by **role hierarchy** (Navy > HQ > Engineer > Air Force > Tank > Missile > Anti-Air > Artillery > Militia > Infantry > Commander)

## Allowed Combinations (Blueprints)

- **Navy** can carry **Air Force**, plus a second slot of **Tank or humanlike roles**
- **Air Force** can carry **Tank**, plus a second slot of **humanlike roles**
- **Tank** can carry **humanlike roles**
- **Engineer** can carry **heavy equipment** (Artillery, Anti-Air, Missile)
- **Headquarter** can carry **Commander**

## What You'll Learn

- Basic stack formation by moving onto a friendly piece
- Carrier behavior for special roles like Engineer and Headquarters
- Practical combinations that match the official blueprints

Combine wisely to move faster, protect key pieces, and strike with surprise.`
      },
      sections: {
        'section-1-combine-basics': {
          title: 'Combination Basics',
          description: 'Learn how to form stacks with standard carriers.',
          introduction: `# Combination Basics

Form a stack by moving a piece onto a friendly piece. The higher-role unit becomes the carrier.

These lessons teach simple, legal combinations.`
        },
        'section-2-carrier-rules': {
          title: 'Carrier Rules',
          description: 'Practice combinations that depend on special carrier rules.',
          introduction: `# Carrier Rules

Some carriers have special combination rules. Practice stacks that are only legal with specific carriers like Navy or Air Force.`
        }
      },
      lessons: {
        'combine-1': {
          title: 'Tank Carries Infantry',
          description: 'Combine a Tank with Infantry to form a stack.',
          content: `## Tank + Infantry

- **Tank** is a valid carrier for **Infantry**
- Move the passenger onto the carrier to combine
- The Tank becomes the bottom piece in the stack`,
          instruction: 'Move the Infantry onto the Tank to combine at e4.',
          hint: 'Select the Infantry on e5 and move to e4.',
          successMessage: 'Good! The Tank becomes the carrier and the Infantry is carried.'
        },
        'combine-2': {
          title: 'Engineer Carries Missile',
          description: 'Engineers can carry heavy equipment like Missiles.',
          content: `## Engineer + Missile

- **Engineer** can carry **heavy equipment** like Missile
- Engineers have specialized carrying capacity for support units
- Useful for transporting defensive pieces`,
          instruction: 'Move the Missile onto the Engineer to combine at e4.',
          hint: 'From e6, the Missile can move down to e4 in two squares.',
          successMessage: 'Correct! The Engineer becomes the carrier for the Missile.'
        },
        'combine-3': {
          title: 'Headquarters Carries Commander',
          description: 'Headquarters can carry the Commander for protection.',
          content: `## Headquarters + Commander

- **Headquarters** is the dedicated carrier for **Commander**
- Provides extra protection for your most important piece
- Essential for defensive setups`,
          instruction: 'Move the Commander onto the Headquarters at e4.',
          hint: 'The Commander on e5 can move down one square to e4.',
          successMessage: 'Well done! Headquarters becomes the carrier for the Commander.'
        },
        'combine-4': {
          title: 'Navy Carries Air Force',
          description: 'Navy can carry Air Force while staying in water zones.',
          content: `## Navy + Air Force

- **Navy** can carry **Air Force** in water zones
- Useful for amphibious operations
- Navy remains carrier even when carrying Air Force`,
          instruction: 'Move the Air Force onto the Navy at c4 to combine.',
          hint: 'Air Force moves from c5 to c4 in one step.',
          successMessage: 'Nice! Navy is now the carrier for Air Force.'
        },
        'combine-5': {
          title: 'Air Force Carries Tank',
          description: 'Air Force can carry a Tank as its first slot.',
          content: `## Air Force + Tank

- **Air Force** can carry **Tank** as primary cargo
- Great for rapid deployment of armored units
- Air Force keeps Tank in first cargo slot`,
          instruction: 'Move the Tank onto the Air Force at f4 to combine.',
          hint: 'The Tank on f6 can move two squares down to f4.',
          successMessage: 'Great! Air Force becomes the carrier and can transport the Tank.'
        }
      }
    },
    'subject-7-deploy-move': {
      subject: {
        title: 'Deploy Move',
        description: 'Split a stack into multiple moves using the deployment system.',
        introduction: `# Deploying a Stack

Deployment lets a combined piece split into multiple moves. Each piece in a stack can **deploy** to a new square during the same turn.

## Core Rules

- Only pieces from the **same stack** can deploy in a session
- Each deployed piece moves using **its own movement rules**
- The deployment ends when all pieces move, or when the **carrier** deploys last

## What You'll Learn

- Deploy every piece from a stack using rightward steps
- Deploy just one piece and stop the session early
- Deploy the carrier to finish the sequence

Deployment turns one stack into a coordinated multi-piece maneuver.`
      },
      sections: {
        'section-1-deploy-basics': {
          title: 'Deployment Basics',
          description: 'Deploy passengers from a combined piece in sequence.',
          introduction: `# Deployment Basics

Start from a combined piece and deploy its passengers one by one.
These lessons focus on deploying cargo to the right in clear steps.`
        },
        'section-2-deploy-carrier': {
          title: 'Deploying the Carrier',
          description: 'Finish a deployment by moving the carrier.',
          introduction: `# Deploying the Carrier

The carrier can deploy too. Moving it ends the deployment sequence.
Practice finishing a deploy by moving the Air Force carrier.`
        }
      },
      lessons: {
        'deploy-1': {
          title: 'Deploy the Full Stack',
          description: 'Split a combined piece by deploying each unit to the right.',
          content: `## Full Deployment

- Deploy **all pieces** from a stack
- Each piece moves **one at a time** to its target
- Complete when all pieces have moved`,
          instruction:
            'Deploy the Infantry to f4, the Tank to g4, and the Air Force to h4. Move each piece right from the stack on e4.',
          hint: 'Select a piece from the stack on e4, then move it one step at a time to the right targets.',
          successMessage: 'Nice! You deployed every piece from the stack.'
        },
        'deploy-2': {
          title: 'Deploy One Piece',
          description: 'Deploy just one passenger from the stack.',
          content: `## Partial Deployment

- You can deploy **just one piece** from a stack
- The remaining pieces stay combined
- Useful for precise positioning`,
          instruction: 'Deploy only the Infantry to f4, then stop the deployment.',
          hint: 'Pick the Infantry from the stack on e4 and move it one square to the right.',
          successMessage: 'Good! You deployed a single piece from the stack.'
        },
        'deploy-3': {
          title: 'Deploy the Carrier',
          description: 'Move the carrier to finish the deployment sequence.',
          content: `## Carrier Deployment

- The **carrier** can also deploy
- When the carrier moves, deployment **ends**
- Use this to finish multi-piece maneuvers`,
          instruction: 'Deploy the Air Force carrier to h4 and finish the deployment.',
          hint: 'Select the Air Force from the stack on e4 and move it three squares right.',
          successMessage: 'Done! Deploying the carrier completes the sequence.'
        }
      }
    },
    'subject-8-heroic-rule': {
      subject: {
        title: 'Heroic Rule',
        description: 'Promote pieces by giving check and use heroic movement.',
        introduction: `# Heroic Promotion from Check

When any piece **puts the enemy Commander in check**, it becomes **Heroic**.
Heroic pieces gain upgraded movement and capture abilities.

## Core Rule

- **Give check → become heroic immediately**
- Heroic pieces are marked with a **+** in notation

## What You'll Learn

- Deliver check in one move to trigger heroic promotion
- Use the upgraded movement of the newly heroic piece`
      },
      sections: {
        'section-1-heroic-promotion': {
          title: 'Heroic Promotion',
          description: 'Give check to promote a piece to heroic status.',
          introduction: `# Trigger Heroic Status

Move a piece to give check and watch it become heroic.`
        },
        'section-2-heroic-movement': {
          title: 'Heroic Movement',
          description: 'Use upgraded movement after promotion.',
          introduction: `# Move as a Heroic Piece

Once promoted, the same unit has extended movement. Use that upgrade to reach a longer target.`
        }
      },
      lessons: {
        'heroic-rule-1': {
          title: 'Promote by Giving Check',
          description: 'Any piece that gives check becomes heroic immediately.',
          content: `# Heroic Promotion

- When a piece **gives check** to the enemy Commander, it becomes **Heroic**
- The promotion happens **immediately** upon giving check
- Heroic pieces gain **enhanced movement** abilities
- Marked with a **+** symbol in notation`,
          instruction: 'Move the Infantry from e4 to e5 to give check to the Commander on e6.',
          hint: 'From e5, the Infantry attacks the Commander on e6 and becomes heroic (+I).',
          successMessage: 'Great! Giving check promoted your Infantry to heroic.'
        },
        'heroic-rule-2': {
          title: 'Move as Heroic',
          description: 'Heroic Infantry moves 2 squares instead of 1.',
          content: `# Heroic Movement

- **Heroic pieces** have **upgraded movement**
- Heroic **Infantry** moves **2 squares** instead of 1
- This enhanced range applies to both movement and capture`,
          instruction: 'Move the heroic Infantry from e5 to e7 in one move.',
          hint: 'Heroic Infantry can move 2 squares orthogonally.',
          successMessage: 'Nice! The heroic Infantry used its upgraded range.'
        }
      }
    },
    'subject-9-flying-general': {
      subject: {
        title: 'Flying General',
        description: 'Prevent commander exposure and recognize illegal captures.',
        introduction: `# Flying General Rule

Commanders may not face each other on a clear file or rank. If they do, either commander can capture the other regardless of distance.

## Core Rule

- Commanders on the **same file or rank** with **no pieces between** are in immediate danger
- Any move that **creates exposure** is illegal

## What You'll Learn

- Why a Commander sometimes cannot capture a nearby target
- How another piece can make the safe capture instead`
      },
      sections: {
        'section-1-flying-general': {
          title: 'Commander Exposure',
          description: 'Learn how the flying general rule restricts commander captures.',
          introduction: `# Commander Exposure

Keep a blocking piece between commanders. If a capture would clear the line, the move is illegal.`
        }
      },
      lessons: {
        'flying-general-1': {
          title: 'Commander Exposure',
          description: 'A commander cannot capture if it would expose a flying general line.',
          content: `# Flying General Rule

- Commanders **cannot face each other** on an open file or rank
- If a Commander capture would **expose your Commander** to the enemy, the move is **illegal**
- Use another piece to make the safe capture instead
- This rule prevents "flying general" situations`,
          instruction:
            'The Commander cannot capture the Infantry on e5 without exposing itself. Capture the Infantry on c5 with the Militia.',
          hint: 'Move the Militia from c4 to c5. The Commander on e4 is blocked by the enemy Infantry on e5.',
          successMessage:
            'Correct! The militia captures safely while the commander stays protected.'
        }
      }
    }
  }
};
