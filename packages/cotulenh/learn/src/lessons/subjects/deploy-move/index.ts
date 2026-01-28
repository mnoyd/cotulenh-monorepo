import type { Subject, Section, Lesson } from '../../../types';
import {
  subject7Introduction,
  section1DeployBasicsIntro,
  section2DeployCarrierIntro
} from '../../../content';

const deployStartFen = '11/11/11/11/11/11/11/11/4(FTI)6/11/11/11 r - - 0 1';

const deployBasicsLessons: Lesson[] = [
  {
    id: 'deploy-1',
    category: 'deployment',
    subjectId: 'subject-7-deploy-move',
    sectionId: 'section-1-deploy-basics',
    title: 'Deploy the Full Stack',
    description: 'Split a combined piece by deploying each unit to the right.',
    difficulty: 2,
    startFen: deployStartFen,
    instruction:
      'Deploy the Infantry to f4, the Tank to g4, and the Air Force to h4. Move each piece right from the stack on e4.',
    hint: 'Select a piece from the stack on e4, then move it one step at a time to the right targets.',
    successMessage: 'Nice! You deployed every piece from the stack.',
    targetSquares: ['f4', 'g4', 'h4'],
    orderedTargets: true,
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  },
  {
    id: 'deploy-2',
    category: 'deployment',
    subjectId: 'subject-7-deploy-move',
    sectionId: 'section-1-deploy-basics',
    title: 'Deploy One Piece',
    description: 'Deploy just one passenger from the stack.',
    difficulty: 1,
    startFen: deployStartFen,
    instruction: 'Deploy only the Infantry to f4, then stop the deployment.',
    hint: 'Pick the Infantry from the stack on e4 and move it one square to the right.',
    successMessage: 'Good! You deployed a single piece from the stack.',
    targetSquares: ['f4'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];

const deployCarrierLessons: Lesson[] = [
  {
    id: 'deploy-3',
    category: 'deployment',
    subjectId: 'subject-7-deploy-move',
    sectionId: 'section-2-deploy-carrier',
    title: 'Deploy the Carrier',
    description: 'Move the carrier to finish the deployment sequence.',
    difficulty: 2,
    startFen: deployStartFen,
    instruction: 'Deploy the Air Force carrier to h4 and finish the deployment.',
    hint: 'Select the Air Force from the stack on e4 and move it three squares right.',
    successMessage: 'Done! Deploying the carrier completes the sequence.',
    targetSquares: ['h4'],
    showValidMoves: true,
    showMoveCount: true,
    validateLegality: true,
    grading: 'none'
  }
];

const section1: Section = {
  id: 'section-1-deploy-basics',
  title: 'Deployment Basics',
  description: 'Deploy passengers from a combined piece in sequence.',
  introduction: section1DeployBasicsIntro,
  lessons: deployBasicsLessons
};

const section2: Section = {
  id: 'section-2-deploy-carrier',
  title: 'Deploying the Carrier',
  description: 'Finish a deployment by moving the carrier.',
  introduction: section2DeployCarrierIntro,
  lessons: deployCarrierLessons
};

export const subject7DeployMove: Subject = {
  id: 'subject-7-deploy-move',
  title: 'Deploy Move',
  description: 'Split a stack into multiple moves using the deployment system.',
  icon: '🧭',
  introduction: subject7Introduction,
  prerequisites: ['subject-6-combine-piece'],
  sections: [section1, section2]
};
