# CotuLenh Rules Study Plan

## Purpose

This guide turns the rules reference into a practical reading and review plan.

Use it together with:

- `docs/cotulenh-rules.md`

The goal is:

1. Read the rules in a stable order
2. Review every piece and every mechanic
3. Use one repeatable logic for rule analysis
4. Check understanding with 10 inference questions

## The Review Logic

For any CotuLenh position or rule question, use this order:

1. Identify the acting piece

- What piece is moving, capturing, combining, deploying, or defending?

2. Check the square types

- Is the start square legal for that piece?
- Is the destination square legal for that piece?
- Is the path crossing land, navy, mixed, river, or bridge squares?

3. Check move shape and range

- Is the move orthogonal or diagonal?
- Is the distance within the piece's current move range?
- If capturing, is it within capture range?
- Is the piece heroic?

4. Check blocking

- Does the piece stop at blockers?
- Does it ignore blockers for movement?
- Does it ignore blockers for capture?
- Does navy-specific blocking apply?

5. Check capture type

- Is this a normal capture?
- Is it a stay capture?
- Is it a suicide capture?
- Can this piece legally perform that capture type?

6. Check special mechanics

- Does air defense affect an Air Force route?
- Is this a valid combination?
- Is a deploy session active?
- Is recombine possible?
- Does heroic promotion trigger?
- Does commander exposure apply?

7. Check board-state consequences

- Does the turn switch now or after deploy commit?
- Is a commander in check?
- Is a commander in danger because of exposure?
- Is the position checkmate, stalemate, or draw?

If a question is unclear, restart from step 1 and do not skip steps.

## Reading Order

### Pass 1: Board Model And Notation

Read these sections first in `docs/cotulenh-rules.md`:

1. `Board Model And Notation`
2. `Terrain Zones`
3. `FEN`
4. `SAN And LAN`

You should know after this pass:

- board size
- files and ranks
- river location
- terrain categories
- bridge squares
- how pieces, stacks, and heroic pieces appear in notation

### Pass 2: Normal Movement

Read these sections next:

1. `1. Basic Movement`
2. `2. Terrain`

Focus questions:

- What is each piece's move range?
- What is each piece's capture range?
- Which pieces move diagonally?
- Which pieces are restricted by terrain?
- Which pieces need bridges?

### Pass 3: Capture And Blocking

Read:

1. `3. Capture`
2. `4. Blocking`

Focus questions:

- Which pieces can only capture normally?
- Which positions allow stay capture?
- What causes suicide capture?
- Which pieces can attack through blockers?
- Which pieces can move through blockers?

### Pass 4: Air Defense And Special Movement

Read:

1. `5. Air Defense`
2. the `Air Force` and `Navy` rows from `1. Basic Movement`

Focus questions:

- Which pieces project air defense?
- What is each defense level?
- How does heroic status change defense?
- What kills an Air Force route?
- When does kamikaze happen?

### Pass 5: Stacks, Combination, And Deploy

Read:

1. `6. Combine Pieces`
2. `7. Deploy Move`

Focus questions:

- Which pieces can be carriers?
- Which stacks are valid?
- How does the engine decide the final carrier?
- What is a deploy session?
- When can recombine happen?
- When does deploy auto-commit?

### Pass 6: Heroic And Flying General

Read:

1. `8. Heroic Rule`
2. `9. Flying General`

Focus questions:

- How does a piece become heroic?
- What changes when a piece becomes heroic?
- What is Last Guard?
- What is the difference between check and commander danger?
- When is a commander move illegal due to exposure?

### Pass 7: Game-State Rules

Read:

1. `10. Game-State Rules`

Focus questions:

- What is check?
- What is checkmate?
- What is stalemate?
- When does commander capture end the game?
- How do repetition and fifty-move draw work?
- Why does active deploy suppress `isGameOver()`?

## Piece-By-Piece Review Checklist

Use this list and answer each item from the rules doc.

### Commander

- movement shape
- capture restriction
- exposure rules
- direct commander capture rule
- heroic interaction

### Infantry

- base move
- base capture
- heroic movement change
- terrain restriction
- stack role

### Engineer

- base move
- base capture
- terrain restriction
- carrier role
- heroic change

### Tank

- base move
- base capture
- terrain restriction
- blocking behavior
- carrier role
- heroic range

### Militia

- base move
- base capture
- diagonal access
- stack role
- heroic change

### Artillery

- move range
- capture range
- diagonal access
- heavy crossing restriction
- stay capture relation
- blocker behavior

### Anti-Air

- movement
- heavy crossing restriction
- defense projection
- heroic defense change

### Missile

- movement
- diagonal limit
- heavy crossing restriction
- defense projection
- blocker behavior

### Air Force

- movement
- capture options
- terrain exception
- blocker exception
- air defense interaction
- carrier role

### Navy

- movement
- terrain restriction
- special blocking behavior
- defense projection
- capture range nuance
- carrier role

### Headquarters

- base immobility
- stack role
- heroic movement
- last guard interaction

## Mechanic Review Checklist

### Normal Movement

- all 11 pieces reviewed
- move versus capture range understood
- orthogonal versus diagonal distinctions understood
- heroic movement changes understood

### Terrain

- pure navy understood
- mixed squares understood
- land squares understood
- heavy bridge crossing understood
- Air Force exception understood

### Capture

- normal capture understood
- stay capture understood
- suicide capture understood
- commander special capture understood
- navy capture nuance understood

### Blocking

- standard blocking understood
- capture-through-blocker pieces understood
- Air Force blocking exception understood
- navy blocking exception understood
- commander slide restriction understood

### Air Defense

- air-defense providers known
- defense levels known
- heroic defense upgrade known
- path-based Air Force checking known
- kamikaze outcome known

### Combination

- valid carrier families known
- same-color restriction known
- slot ordering importance known
- terrain validation for resulting stack known

### Deploy

- session creation understood
- incremental submove behavior understood
- turn switching timing understood
- manual commit understood
- auto-commit understood
- recombine understood
- undo behavior understood

### Heroic Rule

- promotion by giving check understood
- non-moving attacker promotion understood
- movement upgrades understood
- HQ heroic exception understood
- Last Guard understood

### Flying General

- commander exposure understood
- check versus danger understood
- illegal exposed destination understood
- hidden commander edge case noted

### Game-State

- check understood
- checkmate understood
- stalemate understood
- commander capture understood
- repetition understood
- fifty-move rule understood
- deploy suppression of game over understood

## Suggested Study Schedule

### Session 1

- Board, notation, terrain
- All land-unit movement

### Session 2

- Air Force and Navy
- Capture types
- Blocking

### Session 3

- Air defense
- Combination
- Deploy

### Session 4

- Heroic rule
- Flying general
- Game-state rules
- 10-question review

## 10 Comprehension Questions

These questions should be answerable from the rules docs alone.

### Questions

1. Can a Navy on `a1` combine with a Tank on `c5` in one move? Why or why not?

2. If an Air Force flies through enemy air defense and the route result is
   `DESTROYED`, what happens to that move?

3. If a piece cannot legally land on the target square, can the engine still
   allow a capture there? If yes, what kind?

4. Which three piece types project air defense in current core behavior?

5. Can a land unit enter `b4`? Why or why not?

6. Can a heavy piece cross the river anywhere, or only through certain squares?
   Name those squares.

7. What is the difference between `check` and `commander danger`?

8. If a deploy session is active and unfinished, does the turn switch after the
   first deploy submove?

9. A red Commander starts at `c6`. The board is otherwise open. A blue Infantry
   is at `f11`. What is the minimum number of red turns needed for the commander
   to capture that infantry?

10. If Red is reduced to `Commander + 1 non-commander atomic piece`, what
    special rule can trigger automatically?

## Answer Key

### 1. Navy on `a1` combining with Tank on `c5`

No.

Reason:

- Combination requires moving onto the friendly piece's square.
- Navy moves by straight orthogonal or diagonal rays, not arbitrary L-shaped or
  bent routes.
- `a1` to `c5` is not a single orthogonal or diagonal line.
- So the Navy cannot reach `c5` in one move, even though Navy can legally carry
  a Tank in a valid stack.

### 2. Air Force route result `DESTROYED`

That move is illegal and rejected during move generation.

The Air Force does not get a legal move for that route.

### 3. Capture without legal landing

Yes.

The engine may allow a `stay capture`.

That means the attacker stays on its original square and the target is removed.

### 4. Air-defense providers

The three current air-defense providers are:

- Missile
- Navy
- Anti-Air

### 5. Land unit entering `b4`

No.

`b4` is a pure navy square because file `b` is pure navy terrain. Land units
cannot occupy pure navy terrain.

### 6. Heavy crossing squares

Heavy pieces may only cross through bridge routes.

The bridge squares are:

- `f6`
- `f7`
- `h6`
- `h7`

### 7. `check` versus `commander danger`

- `check` means the commander is directly attacked.
- `commander danger` is broader and includes both direct attack and commander
  exposure.

So a commander can be in danger without the engine reporting `check`.

### 8. Turn switching during unfinished deploy

No.

The turn does not switch during an unfinished deploy session. Turn switching
happens only after the deploy commits.

### 9. Minimum turns for Commander at `c6` to capture Infantry at `f11`

Minimum: `3` red turns, assuming the path is open and legal.

One valid route is:

1. `c6 -> c11`
2. `c11 -> e11`
3. `e11 -> f11` capture

Why not fewer?

- Commander moves only orthogonally.
- Commander captures only adjacent squares in normal play.
- The commander must first reach a square adjacent to `f11`.

### 10. Red reduced to Commander plus one non-commander

The `Last Guard` rule can trigger.

That last remaining non-commander atomic piece becomes heroic automatically,
unless the game is configured to skip that promotion.

## Passing Standard

A reader is ready to explain the rules if they can:

1. Answer all 10 questions correctly
2. Explain every piece's move and capture behavior
3. Explain every capture type
4. Explain every terrain class
5. Explain deploy, recombine, heroic, flying general, and game-state rules

## Suggested Next Step

After the reader can answer all 10 questions, add a second question set based
on concrete FEN positions and ask them to classify:

- legal move
- illegal move
- legal capture
- illegal capture
- legal combine
- illegal combine
- legal deploy
- illegal deploy
- check
- danger but not check
