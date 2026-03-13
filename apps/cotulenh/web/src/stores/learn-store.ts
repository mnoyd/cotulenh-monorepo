import { create } from 'zustand';
import {
  createProgressManager,
  getSubjectById,
  LocalStorageAdapter,
  MemoryStorageAdapter,
  type ProgressManager,
  type SubjectProgress,
  type SubjectId
} from '@cotulenh/learn';

type LearnState = {
  initialized: boolean;
  progressVersion: number;
  progressManager: ProgressManager | null;
  initialize: () => void;
  reset: () => void;
  saveLessonProgress: (lessonId: string, stars?: 0 | 1 | 2 | 3, moveCount?: number) => void;
  getSubjectProgress: (subjectId: SubjectId) => SubjectProgress;
  isLessonCompleted: (lessonId: string) => boolean;
  getNextIncompleteLesson: (
    subjectId: SubjectId
  ) => { lessonId: string; sectionId: string; title: string } | null;
  getCompletedLessonCount: (subjectId: SubjectId) => number;
  hasAnyProgress: () => boolean;
};

const emptyProgress: SubjectProgress = {
  subjectId: '',
  completed: false,
  sections: {},
  progress: 0
};

export const useLearnStore = create<LearnState>((set, get) => ({
  initialized: false,
  progressVersion: 0,
  progressManager: null,

  initialize: () => {
    if (get().initialized) return;
    const isServer = typeof window === 'undefined';
    const adapter = isServer ? new MemoryStorageAdapter() : new LocalStorageAdapter();
    const pm = createProgressManager(adapter);
    pm.setOnChange(() => {
      set((state) => ({ progressVersion: state.progressVersion + 1 }));
    });
    set({ initialized: true, progressManager: pm });
  },

  reset: () => {
    set({ initialized: false, progressManager: null, progressVersion: 0 });
  },

  saveLessonProgress: (lessonId, stars = 1, moveCount = 0) => {
    const pm = get().progressManager;
    if (!pm) return;
    pm.saveLessonProgress(lessonId, stars, moveCount);
  },

  getSubjectProgress: (subjectId) => {
    const pm = get().progressManager;
    if (!pm) return { ...emptyProgress, subjectId };
    return pm.getSubjectProgress(subjectId);
  },

  isLessonCompleted: (lessonId) => {
    const pm = get().progressManager;
    if (!pm) return false;
    return pm.isLessonCompleted(lessonId);
  },

  getNextIncompleteLesson: (subjectId) => {
    const pm = get().progressManager;
    if (!pm) return null;
    return pm.getNextIncompleteLesson(subjectId);
  },

  getCompletedLessonCount: (subjectId) => {
    const pm = get().progressManager;
    if (!pm) return 0;
    const subject = getSubjectById(subjectId);
    if (!subject) return 0;

    let completed = 0;
    for (const section of subject.sections) {
      for (const lesson of section.lessons) {
        if (pm.isLessonCompleted(lesson.id)) {
          completed++;
        }
      }
    }

    return completed;
  },

  hasAnyProgress: () => {
    const pm = get().progressManager;
    if (!pm) return false;
    return Object.keys(pm.getAllProgress()).length > 0;
  }
}));
