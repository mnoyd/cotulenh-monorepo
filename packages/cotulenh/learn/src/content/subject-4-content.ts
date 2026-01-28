/**
 * Subject 4: Blocking Mechanism - Introduction Content
 *
 * This file contains the markdown introduction for Subject 4.
 * Separated from lesson definitions for easier content management.
 */

export const subject4Introduction = `
# Blocking Mechanism in Cotulenh

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

**Understanding blocking is the key to both offense and defense!**
`;

export const section1BlockedPiecesIntro = `
# Blocked Pieces

Most pieces in Cotulenh cannot move or capture through other pieces. This creates tactical opportunities for defense and controlling space.

## Key Concepts

- **Movement Blocking**: A piece in the path stops you from moving through
- **Capture Blocking**: A piece in the path stops you from capturing beyond it
- **Line of Sight**: You need a clear path to reach your destination

Learn how blocking affects different pieces through these exercises.
`;

export const section2UnblockedPiecesIntro = `
# Pieces That Ignore Blocking

Some pieces have special abilities that let them bypass blocking:

## Shoot Over Blocking (Capture Only)
- **Tank**: Can shoot over pieces to capture
- **Artillery**: Can shoot over pieces to capture  
- **Missile**: Can shoot over pieces to capture

## Full Ignore Blocking (Move and Capture)
- **Air Force**: Flies over everything
- **Navy**: Moves freely through other pieces

Master these abilities to break through enemy defenses!
`;
