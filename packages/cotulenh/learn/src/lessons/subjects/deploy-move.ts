import type { Subject, Section } from '../../types';
import { deployBasicsLessons, deployCarrierLessons } from '../definitions/deploy-move';
import {
  subject7Introduction,
  section1DeployBasicsIntro,
  section2DeployCarrierIntro
} from '../../content';

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
