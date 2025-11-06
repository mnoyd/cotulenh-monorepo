# Bitboard Engine: Runtime State and Logic

This document details the runtime logic for key operations within the bitboard
engine, based on our recent discussions. It covers FEN generation, attack
detection, and the specific state management required to handle complex game
phases like deploy sessions.

---

## 1. FEN Generation from Bitboards

Generating a FEN (Forsyth-Edwards Notation) string from a bitboard
representation is a methodical process of iterating through the board and
translating the bitboard data.

### Core Logic

The process iterates through each square of the board in FEN order (rank 12 down
to 1, file 'a' to 'k'). For each square, it determines what piece or stack
occupies it by checking all the piece-specific bitboards.

### Generation Algorithm

1.  **Initialize:** Start with an empty string for the FEN's piece-placement
    part and an `empty_square_counter` set to 0.
2.  **Iterate Ranks & Files:** Loop through ranks from 11 down to 0, and for
    each rank, loop through files from 0 to 10.
3.  **Find Pieces on Square:** For each square, calculate its `bit_index`. Check
    this index against every piece bitboard (e.g., `heroicRedTankBitboard`,
    `normalBlueNavyBitboard`). Collect all pieces found on that square into a
    list.
4.  **Build the Rank String:**
    - If no pieces are on the square, increment `empty_square_counter`.
    - If pieces are found:
      1.  If `empty_square_counter > 0`, append its number to the FEN string and
          reset it.
      2.  Format the found piece(s) into the correct FEN notation (e.g., `T`,
          `+n`, or `(NTF)` for stacks) and append it to the string.
5.  **Finalize Rank:** At the end of each rank, flush any remaining
    `empty_square_counter` value and append a `/` separator (if it's not the
    last rank).
6.  **Assemble Full FEN:** Combine the generated piece-placement string with the
    other game state variables (active color, move counters), which are stored
    separately.

### Pseudo-code

```
function generateFenPiecePlacement(all_bitboards):
  fen_string = ""
  for rank from 11 down to 0:
    empty_counter = 0
    for file from 0 to 10:
      // Find all pieces on the current square by checking all bitboards
      pieces_on_square = find_pieces_on_square(all_bitboards, rank, file)

      if pieces_on_square is empty:
        empty_counter++
      else:
        if empty_counter > 0:
          fen_string += empty_counter
          empty_counter = 0
        fen_string += format_pieces_for_fen(pieces_on_square)

    if empty_counter > 0:
      fen_string += empty_counter

    if rank > 0:
      fen_string += "/"

  return fen_string
```

---

## 2. Attack Detection (Is-Attacked Check)

To check if a square (e.g., the Commander's square) is attacked, the engine uses
a "reverse attack" method with pre-computed tables, which is significantly
faster than generating moves for every enemy piece.

### Sliding Piece Attacks (Magic Bitboards)

For pieces like Tanks and Artillery, the "magic bitboard" technique is used.

1.  **Get Magic Entry:** Look up the pre-computed "magic" data for the target
    square (e.g., `e8`) and the attacking piece type (e.g., Red Tank).
2.  **Isolate Blockers:** Use the entry's `mask` and the board's `occupancy`
    bitboard to find all pieces that could possibly block an attack on that
    square.
3.  **Calculate Magic Index:** Use a special "magic" multiplication and bit
    shift to hash the blocker configuration into a unique table index.
4.  **Look Up Attack Pattern:** Use the index to get a pre-computed
    `attack_mask` from an array. This mask represents every square from which a
    Red Tank could attack `e8` with the current blockers.
5.  **Find Attackers:** Perform a bitwise `AND` between this `attack_mask` and
    the bitboard of actual Red Tanks. If the result is not zero, the square is
    attacked.

### Non-Sliding Piece Attacks (Simple Lookups)

For pieces like Infantry, the process is simpler.

1.  **Look Up Attack Pattern:** Get the pre-computed attack pattern for the
    target square `e8` from an array (e.g., `INFANTRY_ATTACKS[e8]`). This
    pattern has bits set on all adjacent squares.
2.  **Find Attackers:** Perform a bitwise `AND` between this pattern and the
    bitboard of actual Red Infantry pieces. If the result is not zero, the
    square is attacked.

---

## 3. Handling Deploy Sessions

A special `DeployState` object is used to manage the game's behavior when a
deploy session is active. This object holds the context for the multi-step turn.

### The Enhanced `DeployState` Object

To handle granular undos, the state object tracks the commands executed within
the session.

```typescript
interface DeployState {
  originSquare: number
  deployingColor: Color
  originalStack: Piece
  deployCommands: Command[] // A history of commands for each step
}
```

### Behavior of Core Functions Mid-Deploy

#### `move()` and Move Generation

- **Behavior:** The only legal moves are for the `remainingPieces` to move from
  the `originSquare`.
- **Logic:** The `_moves()` generation function checks if `_deployState` is
  active. If so, it calculates the pieces remaining at the origin and generates
  moves only for them. Otherwise, it generates moves normally.

#### `turn()` and Turn Changes

- **Behavior:** The turn **does not change** between deploy steps.
- **Logic:** The `_makeMove` function checks if a deploy session is active. If
  it is, it suppresses the normal turn-switching logic. The turn is only
  switched when the session is detected to be complete (all pieces are accounted
  for). The `turn()` function returns the `deployingColor` from the state
  object.

#### `fen()` Generation

- **Behavior:** The FEN string **updates after each deploy step** to reflect the
  new board state.
- **Logic:** The `fen()` function requires no special logic. It always generates
  the FEN from the current state of the bitboards. The "active color" field in
  the FEN is supplied by the `turn()` function, which correctly reports the
  deploying player's color.

#### `isCheck()` Detection

- **Behavior:** Works normally, checking the board state after each deploy step.
- **Logic:** The attack detection algorithm runs on the current bitboards. The
  legal move filter will use this to ensure a player cannot make a deploy move
  that leaves their own Commander in check.

#### `history()`

- **Behavior:** The main game history is **not updated until the entire deploy
  session is complete**.
- **Logic:** The `history()` function only reads from the main `_history` array.
  Individual deploy steps are stored temporarily in
  `_deployState.deployCommands`. Once the session ends, a single, consolidated
  `DeployMove` is pushed to the main history.

#### `undo()`

- **Behavior:** While a deploy session is active, `undo()` reverts only the
  **last deploy step**. Otherwise, it reverts the last full turn.
- **Logic:**
  - **If `_deployState` is active:** `undo()` pops the last command from
    `_deployState.deployCommands` and executes its `undo()` method, reverting
    the bitboards. If this empties the command list, `_deployState` is set to
    `null`, ending the session.
  - **If `_deployState` is null:** `undo()` pops the last command from the main
    `_history` array and executes its `undo()` method, reverting the entire
    turn.
