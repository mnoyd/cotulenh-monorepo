import * as cg from './types.js';
import { key2pos, pos2key } from './util.js';
import { State } from './state.js';
import { findCarriedPieceMatching } from './combined-piece.js';

// Define Influence Zone Data
type AirDefenseInfluenceZone = {
  [key in cg.Role]?: (pos: cg.Pos) => cg.Pos[];
};

// Helper function to check if a position is valid on the board
function isValidPos(pos: number[]): pos is cg.Pos {
  return pos.length === 2 && pos[0] >= 0 && pos[0] <= 11 && pos[1] >= 0 && pos[1] <= 11;
}

export const airDefenseInfluenceZones: AirDefenseInfluenceZone = {
  anti_air: (pos: cg.Pos) => {
    const potentialPositions: number[][] = [
      [pos[0], pos[1] + 1], // up
      [pos[0], pos[1] - 1], // down
      [pos[0] - 1, pos[1]], // left
      [pos[0] + 1, pos[1]], // right
      pos, // self
    ];
    return potentialPositions.filter(isValidPos);
  },
  navy: (pos: cg.Pos) => {
    const potentialPositions: number[][] = [
      [pos[0], pos[1] + 1], // up
      [pos[0], pos[1] - 1], // down
      [pos[0] - 1, pos[1]], // left
      [pos[0] + 1, pos[1]], // right
      pos, // self
    ];
    return potentialPositions.filter(isValidPos);
  },
  missile: (pos: cg.Pos) => {
    const potentialPositions: number[][] = [
      // Direct intersections
      [pos[0], pos[1] + 1], // up 1
      [pos[0], pos[1] + 2], // up 2
      [pos[0], pos[1] - 1], // down 1
      [pos[0], pos[1] - 2], // down 2
      [pos[0] - 1, pos[1]], // left 1
      [pos[0] - 2, pos[1]], // left 2
      [pos[0] + 1, pos[1]], // right 1
      [pos[0] + 2, pos[1]], // right 2
      // Diagonals
      [pos[0] - 1, pos[1] - 1], // down left
      [pos[0] - 1, pos[1] + 1], // up left
      [pos[0] + 1, pos[1] - 1], // down right
      [pos[0] + 1, pos[1] + 1], // up right
      pos, // self
    ];
    return potentialPositions.filter(isValidPos);
  },
};

export function updateAirDefenseInfluenceZones(
  s: State,
  selectedPiece: cg.Piece,
  defenseInfluenceZoneType: AirDefenseInfluenceZoneType,
  draggedToKey?: cg.Key,
): void {
  s.highlight.custom.clear();

  Array.from(s.pieces.entries())
    .filter(([_, piece]) => {
      if (defenseInfluenceZoneType === 'friendly') {
        return isAirDefensePieceOrCarryingAirDefensePiece(piece) && piece.color === selectedPiece.color;
      } else {
        return isAirDefensePieceOrCarryingAirDefensePiece(piece) && piece.color !== selectedPiece.color;
      }
    })
    .forEach(([key, piece]) => {
      // Main piece influence
      let airDefendPiece: cg.Piece = piece;
      if (piece.carrying) {
        const carriedAirDefensePieces = findCarriedPieceMatching(piece, p => cg.isAirDefense(p.role));
        if (carriedAirDefensePieces) {
          airDefendPiece = carriedAirDefensePieces;
        }
      }
      calculateAndHighlightInfluence(s, airDefendPiece, key, draggedToKey, defenseInfluenceZoneType);
    });
}

function calculateAndHighlightInfluence(
  s: State,
  piece: cg.Piece,
  key: cg.Key | string,
  draggedToKey: cg.Key | undefined,
  defenseInfluenceZoneType: AirDefenseInfluenceZoneType,
) {
  const getInfluence = airDefenseInfluenceZones[piece.role];
  if (!getInfluence) return;

  // Use draggedToKey if provided and the piece is the selected one, otherwise use the actual key
  let pos: cg.Pos;
  if (draggedToKey && key === s.selected) {
    pos = key2pos(draggedToKey); // Use the *potential* position
  } else {
    pos = key2pos(key as cg.Key); // Use the *actual* position
  }
  const influence = getInfluence(pos);
  influence.forEach(infPos => {
    const squareKey = pos2key(infPos);
    s.highlight.custom.set(squareKey, 'air-defense-influence ' + defenseInfluenceZoneType);
  });
}

type AirDefenseInfluenceZoneType = 'friendly' | 'opponent';

export function isAirDefenseInfluenceZonePiece(p: cg.Piece): AirDefenseInfluenceZoneType | undefined {
  if (cg.isAirDefense(p.role)) {
    return 'friendly';
  }
  if (findCarriedPieceMatching(p, p => cg.isAirDefense(p.role))) {
    return 'friendly';
  }
  if (p.role === 'air_force') {
    return 'opponent';
  }
  return undefined;
}

export function isAirDefensePieceOrCarryingAirDefensePiece(p: cg.Piece): boolean {
  return cg.isAirDefense(p.role) || findCarriedPieceMatching(p, p => cg.isAirDefense(p.role)) !== undefined;
}
