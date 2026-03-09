import type { Subject, Section, Lesson } from '../../../types';
import type { LearnEngine } from '../../../learn-engine';

const subject10Introduction = '';
const section1CommanderStateIntro = '';
const section2TerminalStatesIntro = '';

const INTERACTION_COMPLETION = (engine: LearnEngine) => engine.interactionCount > 0;

const commanderStateLessons: Lesson[] = [
  {
    id: 'game-state-1',
    category: 'tactics',
    subjectId: 'subject-10-game-state-rules',
    sectionId: 'section-1-commander-state',
    title: 'Commander Danger Is Broader Than Check',
    description:
      'Two commanders can face each other directly and create danger without the engine reporting check.',
    difficulty: 1,
    startFen: '5c5/11/11/11/11/11/11/11/11/11/11/5C5 r - - 0 1',
    instruction:
      'Inspect this position. The commanders face each other on the same file, which is commander danger, but it is not direct check. Click any square to complete.',
    hint:
      'Check needs a direct attack. Commander danger also includes exposure created by the flying-general rule.',
    successMessage:
      'Correct! Commander danger includes exposure, even when `isCheck()` is false.',
    customCompletion: INTERACTION_COMPLETION,
    grading: 'none',
    showValidMoves: false
  },
  {
    id: 'game-state-2',
    category: 'tactics',
    subjectId: 'subject-10-game-state-rules',
    sectionId: 'section-1-commander-state',
    title: 'Recognize Checkmate',
    description: 'Checkmate means the commander is attacked and there are no legal moves to escape.',
    difficulty: 2,
    startFen: '5c5/11/11/11/11/11/11/11/11/11/4igi4/4iCi4 r - - 0 1',
    instruction:
      'Inspect the board. Red is in check and has no legal reply, so this position is checkmate. Click any square to complete.',
    hint:
      'The Tank on f2 gives check, the Infantry on e1 and g1 block sideways movement, and e2/g2 cover the capture escapes.',
    successMessage: 'Correct! Checkmate requires both check and zero legal escapes.',
    customCompletion: INTERACTION_COMPLETION,
    grading: 'none',
    showValidMoves: false
  },
  {
    id: 'game-state-3',
    category: 'tactics',
    subjectId: 'subject-10-game-state-rules',
    sectionId: 'section-1-commander-state',
    title: 'Recognize Stalemate',
    description: 'Stalemate means the side to move is not in check but still has no legal moves.',
    difficulty: 2,
    startFen: '11/11/11/11/11/11/11/11/3C7/4+M6/2c8/11 b - - 7 4',
    instruction:
      'Inspect the board. Blue is not in check, but Blue has no legal moves, so this position is stalemate. Click any square to complete.',
    hint:
      'Stalemate differs from checkmate because the trapped commander is not under direct attack.',
    successMessage: 'Correct! No legal moves without check is stalemate.',
    customCompletion: INTERACTION_COMPLETION,
    grading: 'none',
    showValidMoves: false
  }
];

const terminalStateLessons: Lesson[] = [
  {
    id: 'game-state-4',
    category: 'tactics',
    subjectId: 'subject-10-game-state-rules',
    sectionId: 'section-2-terminal-and-draws',
    title: 'Commander Capture Ends the Game',
    description: 'Capturing the enemy commander is an immediate terminal result.',
    difficulty: 1,
    startFen: '6c4/11/11/11/11/11/11/11/11/5t5/11/5C5 b - - 0 1',
    goalFen: '6c4/11/11/11/11/11/11/11/11/11/11/5t5 r - - 0 2',
    instruction:
      'Capture the red Commander on f1 with the blue Tank from f3. Commander capture ends the game immediately.',
    hint: 'The Tank has 2-square orthogonal capture range, so `f3 -> f1` is legal.',
    successMessage: 'Correct! Commander capture is terminal as soon as the move lands.',
    targetSquares: ['f1'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  },
  {
    id: 'game-state-5',
    category: 'tactics',
    subjectId: 'subject-10-game-state-rules',
    sectionId: 'section-2-terminal-and-draws',
    title: 'Draw Rules And Deploy Timing',
    description:
      'Draw detection includes the fifty-move rule, repetition tracking, and a special deploy-session timing exception.',
    difficulty: 2,
    startFen: '6c4/11/11/11/11/11/11/11/11/11/11/4C6 r - - 100 1',
    instruction:
      'Inspect this board. The halfmove counter already reaches the fifty-move threshold, so the position is drawable even though the board is otherwise quiet. Click any square to complete.',
    hint:
      'The engine also tracks threefold repetition by full-position history, and active deploy sessions pause `isGameOver()` until the deploy resolves.',
    successMessage: 'Correct! Draw logic depends on both board state and game history.',
    customCompletion: INTERACTION_COMPLETION,
    grading: 'none',
    showValidMoves: false
  }
];

const section1: Section = {
  id: 'section-1-commander-state',
  title: 'Commander State',
  description: 'Differentiate danger, check, checkmate, and stalemate.',
  introduction: section1CommanderStateIntro,
  lessons: commanderStateLessons
};

const section2: Section = {
  id: 'section-2-terminal-and-draws',
  title: 'Terminal And Draw States',
  description: 'Learn commander capture, draw triggers, and deploy timing exceptions.',
  introduction: section2TerminalStatesIntro,
  lessons: terminalStateLessons
};

export const subject10GameStateRules: Subject = {
  id: 'subject-10-game-state-rules',
  title: 'Game-State Rules',
  description: 'Learn how CotuLenh distinguishes check, danger, terminal states, and draw conditions.',
  icon: '🏁',
  introduction: subject10Introduction,
  prerequisites: ['subject-8-heroic-rule', 'subject-9-flying-general'],
  sections: [section1, section2]
};
