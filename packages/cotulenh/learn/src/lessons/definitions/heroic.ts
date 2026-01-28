import type { Lesson } from '../../types';

/**
 * Heroic Lessons - Learn how heroic status enhances piece movement
 *
 * Heroic pieces gain +1 movement range and often gain diagonal movement.
 * Each lesson places both a normal and heroic piece to demonstrate the difference.
 */
export const heroicLessons: Lesson[] = [
  {
    id: 'heroic-1',
    category: 'heroic',
    title: 'Heroic Infantry',
    description: 'Heroic Infantry moves 2 squares instead of 1',
    difficulty: 1,
    startFen: '11/11/11/11/11/3I3+I3/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Use both Infantry to reach all targets. The heroic Infantry (+I) can move 2 squares!',
    hint: 'Normal Infantry: 1 square orthogonally. Heroic Infantry: 2 squares orthogonally.',
    successMessage: 'Heroic Infantry gains extended range - 2 squares instead of 1!',
    targetSquares: ['d8', 'd10', 'h8', 'h10']
  },
  {
    id: 'heroic-2',
    category: 'heroic',
    title: 'Heroic Tank',
    description: 'Heroic Tank moves 3 squares instead of 2',
    difficulty: 1,
    startFen: '11/11/11/11/11/3T3+T3/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Use both Tanks to reach all targets. The heroic Tank (+T) can move 3 squares!',
    hint: 'Normal Tank: 2 squares orthogonally. Heroic Tank: 3 squares orthogonally.',
    successMessage: 'Heroic Tank gains extended range - 3 squares instead of 2!',
    targetSquares: ['d9', 'd11', 'h9', 'h11']
  },
  {
    id: 'heroic-3',
    category: 'heroic',
    title: 'Heroic Militia',
    description: 'Heroic Militia moves 2 squares in any direction',
    difficulty: 1,
    startFen: '11/11/11/11/11/3M3+M3/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Use both Militia to reach all targets. The heroic Militia (+M) can move 2 squares!',
    hint: 'Normal Militia: 1 square in any direction. Heroic Militia: 2 squares in any direction.',
    successMessage: 'Heroic Militia gains extended range - 2 squares in any direction!',
    targetSquares: ['c8', 'e8', 'g8', 'i8']
  },
  {
    id: 'heroic-4',
    category: 'heroic',
    title: 'Heroic Engineer',
    description: 'Heroic Engineer moves 2 squares instead of 1',
    difficulty: 1,
    startFen: '11/11/11/11/11/3E3+E3/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Use both Engineers to reach all targets. The heroic Engineer (+E) can move 2 squares!',
    hint: 'Normal Engineer: 1 square orthogonally. Heroic Engineer: 2 squares orthogonally.',
    successMessage: 'Heroic Engineer gains extended range - 2 squares instead of 1!',
    targetSquares: ['d8', 'd10', 'h8', 'h10']
  },
  {
    id: 'heroic-5',
    category: 'heroic',
    title: 'Heroic Anti-Air',
    description: 'Heroic Anti-Air moves 2 squares and has extended coverage',
    difficulty: 1,
    startFen: '11/11/11/11/11/3G3+G3/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Use both Anti-Air units to reach all targets. The heroic Anti-Air (+Y) can move 2 squares!',
    hint: 'Normal Anti-Air: 1 square orthogonally. Heroic Anti-Air: 2 squares orthogonally.',
    successMessage: 'Heroic Anti-Air gains extended range and air defense coverage!',
    targetSquares: ['d8', 'd10', 'h8', 'h10']
  },
  {
    id: 'heroic-6',
    category: 'heroic',
    title: 'Heroic Artillery',
    description: 'Heroic Artillery moves 4 squares and gains diagonal attack',
    difficulty: 1,
    startFen: '11/11/11/11/11/11/11/11/3A3+A3/11/11/11 r - - 0 1',
    instruction:
      'Use both Artillery to reach all targets. The heroic Artillery (+A) can move 4 squares!',
    hint: 'Normal Artillery: 3 squares in all directions. Heroic Artillery: 4 squares in all directions.',
    successMessage:
      'Heroic Artillery gains extended range - 4 squares and enhanced diagonal attack!',
    targetSquares: ['d6', 'd12', 'h6', 'h12']
  },
  {
    id: 'heroic-7',
    category: 'heroic',
    title: 'Heroic Missile',
    description: 'Heroic Missile moves 3 squares with extended diagonal reach',
    difficulty: 1,
    startFen: '11/11/11/11/11/3S3+S3/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Use both Missiles to reach all targets. The heroic Missile (+S) can move 3 squares!',
    hint: 'Normal Missile: 2 squares orthogonal, 1 diagonal. Heroic: 3 squares orthogonal, 2 diagonal.',
    successMessage: 'Heroic Missile gains extended range - 3 squares orthogonal and 2 diagonal!',
    targetSquares: ['d8', 'd10', 'h8', 'h10']
  },
  {
    id: 'heroic-8',
    category: 'heroic',
    title: 'Heroic Air Force',
    description: 'Heroic Air Force moves 5 squares and ignores air defense',
    difficulty: 1,
    startFen: '11/11/11/11/11/3F3+F3/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Use both Air Force units to reach all targets. The heroic Air Force (+F) moves 5 squares!',
    hint: 'Normal Air Force: 4 squares. Heroic Air Force: 5 squares and ignores air defense.',
    successMessage: 'Heroic Air Force gains extended range and can ignore enemy air defense!',
    targetSquares: ['d2', 'd11', 'h2', 'h11']
  },
  {
    id: 'heroic-9',
    category: 'heroic',
    title: 'Heroic Navy',
    description: 'Heroic Navy moves 5 squares on water',
    difficulty: 1,
    startFen: '11/1+N9/11/11/11/11/11/11/11/11/N10/11 r - - 0 1',
    instruction: 'Use both Navy ships to reach all targets. The heroic Navy (+N) moves 5 squares!',
    hint: 'Normal Navy: 4 squares on water. Heroic Navy: 5 squares on water.',
    successMessage: 'Heroic Navy gains extended range - 5 squares for greater water control!',
    targetSquares: ['a8', 'b5', 'a4', 'b9']
  },
  {
    id: 'heroic-11',
    category: 'heroic',
    title: 'Heroic Headquarters',
    description: 'Heroic Headquarters can actually move!',
    difficulty: 1,
    startFen: '11/11/11/11/11/5+H5/11/11/5H5/11/11/11 r - - 0 1',
    instruction: 'The heroic Headquarters (+H) can move 1 square! Reach all targets.',
    hint: 'Normal Headquarters cannot move. Heroic Headquarters can move 1 square orthogonally.',
    successMessage:
      'Amazing! Heroic Headquarters gains the ability to move - 1 square orthogonally!',
    targetSquares: ['f8', 'e7', 'g7', 'f6']
  }
];
