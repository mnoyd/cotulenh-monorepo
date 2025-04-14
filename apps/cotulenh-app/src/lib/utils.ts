import type { CoTuLenh, Square, Move, Color } from '@repo/cotulenh-core';

/**
 * Calculates the possible destinations for each piece on the board for CoTuLenh.
 * @param game - The CoTuLenh game instance.
 * @returns A Map where keys are origin squares (e.g., 'e2') and values are arrays of destination squares (e.g., ['e3', 'e4']).
 */
export function getPossibleMoves(game: CoTuLenh): Map<Square, Square[]> {
    const dests = new Map<Square, Square[]>();
    const moves = game.moves({ verbose: true }) as Move[];

    for (const move of moves) {
        if (!dests.has(move.from)) {
            dests.set(move.from, []);
        }
        dests.get(move.from)!.push(move.to);
    }

    return dests;
}

/**
 * Gets the display name for the current turn color ('r' or 'b').
 * @param turn - The current turn ('r' or 'b').
 * @returns 'Red' or 'Blue'.
 */
export function getTurnColorName(turn: Color): string {
    return turn === 'r' ? 'Red' : 'Blue';
}
