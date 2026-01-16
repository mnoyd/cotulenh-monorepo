import type { Lesson } from '../types';

export const basicsLessons: Lesson[] = [
  {
    id: 'basics-1',
    category: 'basics',
    title: 'Moving Infantry',
    description: 'Learn how infantry moves one square at a time',
    difficulty: 1,
    steps: [
      {
        fen: '11/11/11/11/11/5I5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'The Infantry moves one square orthogonally (up, down, left, or right). Move the Infantry forward!',
        expectedMoves: [{ from: 'f6', to: 'f7' }],
        hint: 'Click the Infantry and move it one square up toward the enemy side.',
        successMessage: 'Excellent! Infantry advances one square at a time.'
      },
      {
        fen: '11/11/11/11/5I5/11/11/11/11/11/11/11 r - - 0 1',
        instruction: 'Now move the Infantry to the right.',
        expectedMoves: [{ from: 'f8', to: 'g8' }],
        hint: 'Move horizontally this time - click and drag to the right.',
        successMessage: 'Perfect! Infantry can move in any orthogonal direction.'
      },
      {
        fen: '11/11/11/5I5/11/11/11/11/11/11/11/11 r - - 0 1',
        instruction: 'Infantry can also move backward. Move the Infantry down.',
        expectedMoves: [{ from: 'f9', to: 'f8' }],
        hint: 'Move the Infantry one square toward your own side.',
        successMessage: 'Great! Unlike pawns in chess, Infantry can retreat.'
      }
    ]
  },
  {
    id: 'basics-2',
    category: 'basics',
    title: 'Capturing Pieces',
    description: 'Learn how to capture enemy pieces',
    difficulty: 1,
    steps: [
      {
        fen: '11/11/11/11/5i5/5I5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          "To capture, move your piece to the enemy's square. Capture the blue infantry!",
        expectedMoves: [{ from: 'f6', to: 'f7' }],
        hint: 'Move your Infantry (uppercase I) onto the enemy infantry (lowercase i).',
        successMessage: 'Victory! You captured the enemy piece.'
      },
      {
        fen: '11/11/11/11/4it5/5I5/11/11/11/11/11/11 r - - 0 1',
        instruction: 'Capture the enemy tank! But be careful - tanks are more valuable.',
        expectedMoves: [{ from: 'f6', to: 'f7' }],
        hint: 'Move your Infantry to capture the enemy tank.',
        successMessage:
          "Excellent capture! In Cờ Tư Lệnh, even an Infantry can capture a Tank if it's in range."
      }
    ]
  },
  {
    id: 'basics-3',
    category: 'basics',
    title: 'The Commander',
    description: 'Protect your Commander at all costs',
    difficulty: 1,
    steps: [
      {
        fen: '11/11/11/11/11/5G5/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'The Commander (G) is your most important piece. If captured, you lose! Move the Commander forward.',
        expectedMoves: [{ from: 'f6', to: 'f7' }],
        hint: 'The Commander moves one square in any direction. Move it forward.',
        successMessage: 'The Commander moves like a King in chess - one square any direction.'
      },
      {
        fen: '11/11/11/11/11/4iGi4/11/11/11/11/11/11 r - - 0 1',
        instruction:
          'Your Commander is surrounded! Capture one of the enemy infantry to create an escape route.',
        expectedMoves: [
          { from: 'f6', to: 'e6' },
          { from: 'f6', to: 'g6' }
        ],
        hint: 'The Commander can capture in any direction. Take one of the enemy infantry!',
        successMessage: 'Well done! The Commander can capture enemies just like other pieces.'
      }
    ]
  }
];
