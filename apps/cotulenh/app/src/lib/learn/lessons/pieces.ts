import type { Lesson } from '../types';

export const piecesLessons: Lesson[] = [
  {
    id: 'pieces-1',
    category: 'pieces',
    title: 'The Tank',
    description: 'Master the powerful Tank unit',
    difficulty: 1,
    steps: [
      {
        fen: '11/11/11/11/11/5T5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'The Tank moves up to 2 squares orthogonally (up, down, left, right). Move the Tank two squares forward!',
        expectedMoves: [{ from: 'f6', to: 'f8' }],
        hint: 'Click the Tank and move it two squares up.',
        successMessage: 'Excellent! Tanks can move 1 or 2 squares in a straight line.'
      },
      {
        fen: '11/11/11/5T5/11/11/11/11/11/11/11/11 r - - 0 1',
        instruction: 'Now move the Tank just one square to the left.',
        expectedMoves: [{ from: 'f9', to: 'e9' }],
        hint: 'Tanks can also move just one square. Try moving left.',
        successMessage: 'Perfect! Tanks are flexible - they can move 1 or 2 squares.'
      },
      {
        fen: '11/11/11/11/4i6/5T5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'Tanks capture the same way they move. Capture the enemy infantry in one move!',
        expectedMoves: [{ from: 'f6', to: 'e7' }],
        hint: 'Wait - Tanks move orthogonally, not diagonally! This capture is not possible.',
        successMessage: 'Remember: Tanks only move in straight lines, not diagonally.'
      }
    ]
  },
  {
    id: 'pieces-2',
    category: 'pieces',
    title: 'The Artillery',
    description: 'Learn the long-range Artillery',
    difficulty: 2,
    steps: [
      {
        fen: '11/11/11/11/11/5A5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'Artillery can move any number of squares orthogonally, like a Rook in chess. Move it to the top of the board!',
        expectedMoves: [{ from: 'f6', to: 'f12' }],
        hint: 'Move the Artillery all the way up in a straight line.',
        successMessage: 'Artillery has unlimited range in straight lines!'
      },
      {
        fen: '11/11/11/11/3i7/11/11/5A5/11/11/11/11 r - - 0 1',
        instruction:
          'Artillery captures by jumping over exactly one piece (friend or foe) to land on an enemy. Capture the enemy infantry!',
        expectedMoves: [{ from: 'f4', to: 'd7' }],
        hint: 'Wait - Artillery needs to jump over a piece to capture. This position may not allow that.',
        successMessage: 'Artillery captures like a Cannon in Xiangqi - jumping over one piece.'
      }
    ]
  },
  {
    id: 'pieces-3',
    category: 'pieces',
    title: 'The Air Force',
    description: 'Command the skies with Air Force',
    difficulty: 2,
    steps: [
      {
        fen: '11/11/11/11/11/5F5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'The Air Force can fly anywhere on the board! Move it to the far corner at k12.',
        expectedMoves: [{ from: 'f6', to: 'k12' }],
        hint: 'Air Force ignores terrain and other pieces. Click and move to k12.',
        successMessage: 'Amazing! Air Force has ultimate mobility - it can reach any square.'
      },
      {
        fen: '11/11/11/11/11/11/11/11/11/11/11/F10 r - - 0 1',
        instruction:
          'Air Force can fly over any pieces. Move from a1 to the center of the board at f6.',
        expectedMoves: [{ from: 'a1', to: 'f6' }],
        hint: 'The Air Force can fly to any empty square or capture any enemy.',
        successMessage: "Air Force is the most mobile piece, but it's vulnerable to Anti-Air!"
      }
    ]
  }
];
