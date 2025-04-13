// --- Constants ---
const FILES = 'abcdefghijk'.split(''); // 11 files
const RANKS = '12,11,10,9,8,7,6,5,4,3,2,1'.split(','); // 12 ranks
const SQUARES = FILES.flatMap(f => RANKS.map(r => `${f}${r}`));
/**
 * Converts a numeric coordinate (e.g., '0-0', '10-11') to algebraic notation.
 * @param coord The numeric coordinate key ('fileIndex-rankIndex').
 * @returns The corresponding algebraic square (e.g., 'a12', 'k1') or null if invalid.
 */
export function numericToAlgebraic(coord) {
    const parts = coord.split('-');
    if (parts.length !== 2) {
        console.error(`Invalid numeric coordinate format: ${coord}`);
        return null;
    }
    const fileIndex = parseInt(parts[0], 10);
    const rankIndex = parseInt(parts[1], 10);
    if (isNaN(fileIndex) || isNaN(rankIndex) ||
        fileIndex < 0 || fileIndex >= FILES.length ||
        rankIndex < 0 || rankIndex >= RANKS.length) {
        console.error(`Invalid indices parsed from numeric coordinate ${coord}: file=${fileIndex}, rank=${rankIndex}`);
        return null;
    }
    return `${FILES[fileIndex]}${RANKS[rankIndex]}`;
}
/**
 * Converts an algebraic square notation to the numeric coordinate key.
 * @param sq The algebraic square (e.g., 'a12', 'k1').
 * @returns The corresponding numeric coordinate ('fileIndex-rankIndex') or null if invalid.
 */
export function algebraicToNumeric(sq) {
    const fileChar = sq.charAt(0);
    const rankStr = sq.substring(1);
    const fileIndex = FILES.indexOf(fileChar);
    const rankIndex = RANKS.indexOf(rankStr);
    if (fileIndex === -1 || rankIndex === -1) {
        console.error(`Invalid algebraic square: ${sq}`);
        return null;
    }
    // Key format is 'fileIndex-rankIndex'
    return `${fileIndex}-${rankIndex}`;
}
// --- Example Usage (for testing/verification) ---
/*
console.log('0-0 ->', numericToAlgebraic('0-0')); // Expected: a12
console.log('10-0 ->', numericToAlgebraic('10-0')); // Expected: k12
console.log('0-1 ->', numericToAlgebraic('0-1')); // Expected: a11
console.log('10-11 ->', numericToAlgebraic('10-11')); // Expected: k1
console.log('a12 ->', algebraicToNumeric('a12')); // Expected: 0-0
console.log('k12 ->', algebraicToNumeric('k12')); // Expected: 10-0
console.log('a11 ->', algebraicToNumeric('a11')); // Expected: 0-1
console.log('k1 ->', algebraicToNumeric('k1')); // Expected: 10-11
*/
export function toDests(chess) {
    const dests = new Map(); // Use NumericCoordinate (Key) as map key type
    SQUARES.forEach((s) => {
        const numericKey = algebraicToNumeric(s); // Convert algebraic source to numeric key
        if (!numericKey)
            return; // Skip if conversion fails
        const ms = chess.moves({ square: s, verbose: true });
        if (ms.length) {
            // Assuming ms contains Moves where 'to' is already a Key
            const validMoves = ms.map((m) => m.to).filter(key => key !== undefined);
            if (validMoves.length > 0) {
                dests.set(numericKey, validMoves);
            }
        }
    });
    return dests;
}
//# sourceMappingURL=index.js.map