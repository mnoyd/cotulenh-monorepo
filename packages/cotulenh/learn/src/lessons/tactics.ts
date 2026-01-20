import type { Lesson } from '../types';

/**
 * Tactics lessons use scenarios for interactive puzzles
 * where the opponent responds to player moves.
 */
export const tacticsLessons: Lesson[] = [
  {
    id: 'tactics-1',
    category: 'tactics',
    title: 'Capture the Commander',
    description: 'Find the winning move to capture the enemy Commander',
    difficulty: 1,
    startFen: '11/11/11/11/5g5/4T6/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5T5/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'The enemy Commander is undefended. Capture it with your Tank!',
    hint: 'Move your Tank to capture the Commander directly.',
    successMessage: 'Checkmate! You captured the enemy Commander!',
    optimalMoves: 1,
    scenario: ['e6f7']
  },
  {
    id: 'tactics-2',
    category: 'tactics',
    title: 'Attack and Defend',
    description: 'Attack while your opponent tries to defend',
    difficulty: 2,
    startFen: '11/11/11/11/5gi4/4T6/11/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/5T5/11/11/11/11/11/11/11 r - - 0 1',
    instruction: 'Capture the Infantry first, then take the Commander when it tries to escape!',
    hint: 'First capture the Infantry at g7, then pursue the Commander.',
    successMessage: 'Excellent tactical play! You chased down the Commander.',
    failureMessage: 'The Commander escaped! Try capturing the Infantry first.',
    optimalMoves: 2,
    scenario: [
      'e6g7', // Player: Tank captures Infantry
      'f7f8', // Opponent: Commander tries to escape
      'g7f8' // Player: Tank captures Commander
    ]
  },
  {
    id: 'tactics-3',
    category: 'tactics',
    title: 'The Fork',
    description: 'Attack two pieces at once with a fork',
    difficulty: 2,
    startFen: '11/11/11/11/4g1t4/11/5T5/11/11/11/11/11 r - - 0 1',
    goalFen: '11/11/11/11/11/5T5/11/11/11/11/11/11 r - - 0 1',
    instruction:
      'Move your Tank to a square where it attacks both the Commander and the enemy Tank!',
    hint: 'Find a square where your Tank threatens two pieces at once.',
    successMessage: 'Perfect fork! You attacked both pieces simultaneously.',
    failureMessage: "That's not the forking square. Look for where you can attack both pieces.",
    optimalMoves: 1,
    scenario: ['f5f6'],
    arrows: [
      { from: 'f6', to: 'e7', color: 'red' },
      { from: 'f6', to: 'g7', color: 'red' }
    ]
  }
];
