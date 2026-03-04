import { describe, expect, it } from 'vitest';
import {
  applyReplayNavigation,
  getReplayActionFromKey,
  isReplayAtEnd,
  isReplayAtStart,
  syncStartPositionWithHistory
} from './replay-controls';

describe('replay-controls', () => {
  describe('applyReplayNavigation', () => {
    it('goes from start position to first move with next', () => {
      const next = applyReplayNavigation(
        {
          showStartPosition: true,
          viewIndex: -1,
          historyLength: 4
        },
        'next'
      );

      expect(next).toEqual({ showStartPosition: false, viewIndex: 0 });
    });

    it('goes from final position to last move with prev', () => {
      const next = applyReplayNavigation(
        {
          showStartPosition: false,
          viewIndex: -1,
          historyLength: 4
        },
        'prev'
      );

      expect(next).toEqual({ showStartPosition: false, viewIndex: 3 });
    });

    it('goes from first move to start position with prev', () => {
      const next = applyReplayNavigation(
        {
          showStartPosition: false,
          viewIndex: 0,
          historyLength: 4
        },
        'prev'
      );

      expect(next).toEqual({ showStartPosition: true, viewIndex: -1 });
    });

    it('goes from last preview move to final position with next', () => {
      const next = applyReplayNavigation(
        {
          showStartPosition: false,
          viewIndex: 3,
          historyLength: 4
        },
        'next'
      );

      expect(next).toEqual({ showStartPosition: false, viewIndex: -1 });
    });

    it('forces start position with first', () => {
      const next = applyReplayNavigation(
        {
          showStartPosition: false,
          viewIndex: 2,
          historyLength: 4
        },
        'first'
      );

      expect(next).toEqual({ showStartPosition: true, viewIndex: -1 });
    });

    it('forces final position with last', () => {
      const next = applyReplayNavigation(
        {
          showStartPosition: true,
          viewIndex: -1,
          historyLength: 4
        },
        'last'
      );

      expect(next).toEqual({ showStartPosition: false, viewIndex: -1 });
    });

    it('keeps empty games at start/final boundary', () => {
      const next = applyReplayNavigation(
        {
          showStartPosition: true,
          viewIndex: -1,
          historyLength: 0
        },
        'next'
      );

      expect(next).toEqual({ showStartPosition: true, viewIndex: -1 });
    });
  });

  describe('boundaries', () => {
    it('reports start and end for empty history', () => {
      const state = {
        showStartPosition: true,
        viewIndex: -1,
        historyLength: 0
      };

      expect(isReplayAtStart(state)).toBe(true);
      expect(isReplayAtEnd(state)).toBe(true);
    });

    it('reports final position as end when not at start', () => {
      const state = {
        showStartPosition: false,
        viewIndex: -1,
        historyLength: 4
      };

      expect(isReplayAtStart(state)).toBe(false);
      expect(isReplayAtEnd(state)).toBe(true);
    });
  });

  describe('getReplayActionFromKey', () => {
    it('maps navigation keys', () => {
      expect(getReplayActionFromKey({ key: 'ArrowLeft' })).toBe('prev');
      expect(getReplayActionFromKey({ key: 'ArrowRight' })).toBe('next');
      expect(getReplayActionFromKey({ key: 'Home' })).toBe('first');
      expect(getReplayActionFromKey({ key: 'End' })).toBe('last');
    });

    it('ignores inputs and modifiers', () => {
      expect(getReplayActionFromKey({ key: 'ArrowLeft', targetTagName: 'input' })).toBeNull();
      expect(getReplayActionFromKey({ key: 'ArrowLeft', targetTagName: 'textarea' })).toBeNull();
      expect(getReplayActionFromKey({ key: 'ArrowLeft', ctrlKey: true })).toBeNull();
      expect(getReplayActionFromKey({ key: 'ArrowLeft', metaKey: true })).toBeNull();
      expect(getReplayActionFromKey({ key: 'ArrowLeft', altKey: true })).toBeNull();
    });
  });

  describe('syncStartPositionWithHistory', () => {
    it('exits start position when a move index is previewed', () => {
      expect(syncStartPositionWithHistory(true, 2)).toBe(false);
    });

    it('keeps start position when index is final marker', () => {
      expect(syncStartPositionWithHistory(true, -1)).toBe(true);
    });
  });
});
