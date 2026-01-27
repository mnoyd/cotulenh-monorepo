import type { Subject, Section } from '../types';
import { captureLessons } from './capture';

const section1: Section = {
  id: 'section-1-capture-basics',
  title: 'Capture Basics',
  description: 'Learn normal capture, stay capture, and special capture cases.',
  introduction: `
# Capture Basics

Capturing removes enemy pieces from the board. Cotulenh features multiple capture styles:

## Capture Types Overview

| Type | How It Works | Which Units |
|------|--------------|-------------|
| Normal | Move onto enemy square | All units |
| Stay | Destroy target without moving | Artillery, Air Force, Navy, Missile |
| Suicide | Both pieces destroyed | Air Force (kamikaze) |

## Key Concepts

- **Capture Range**: Some pieces have different capture ranges than movement ranges (e.g., Commander)
- **Blocking**: Most pieces cannot capture through other pieces; some exceptions exist
- **Terrain**: Capture follows the same terrain rules as movement

Each lesson teaches one capture mechanic through practice.
  `,
  lessons: captureLessons
};

export const subject3Capture: Subject = {
  id: 'subject-3-capture',
  title: 'Capture',
  description: 'Learn normal capture, stay capture, and special capture cases.',
  icon: '⚔️',
  introduction: `
# Capture in Cotulenh

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

| Unit | Move Range | Capture Range | Notes |
|------|------------|---------------|-------|
| Commander | Unlimited | 1 square | Moves like a Rook, but captures only adjacent squares |
| Heroic Commander | Unlimited | 2 squares | Enhanced capture range when heroic |
| All others | Same | Same | Move and capture ranges are identical |

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

**Combat is the heart of strategy. Master these captures to dominate the battlefield!**
  `,
  prerequisites: ['subject-1-basic-movement', 'subject-2-terrain'],
  sections: [section1]
};
