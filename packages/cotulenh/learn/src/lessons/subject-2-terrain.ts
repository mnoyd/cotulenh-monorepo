import type { Subject, Section } from '../types';
import { terrainLessons } from './terrain';

const section1: Section = {
  id: 'section-1-terrain-basics',
  title: 'Terrain Basics',
  description: 'Learn water, land, river crossings, and mixed zones.',
  introduction: `
# Terrain Basics

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

These lessons teach each rule through hands-on practice.
  `,
  lessons: terrainLessons
};

export const subject2Terrain: Subject = {
  id: 'subject-2-terrain',
  title: 'Terrain',
  description: 'Learn water, land, river crossings, and mixed zones.',
  icon: '🌊',
  introduction: `
# Terrain in Cotulenh

The Cotulenh battlefield is not a uniform playing field. Terrain shapes every tactical decision, determining where your units can operate and how they must maneuver to achieve objectives.

## The Terrain System

The 11×12 board is divided into distinct operational zones that simulate different environments - from open seas to contested coastlines to inland territory.

### Water Zones (Files a-b)

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

**Terrain mastery separates novice commanders from experts. Let's begin!**
  `,
  prerequisites: ['subject-1-basic-movement'],
  sections: [section1]
};
