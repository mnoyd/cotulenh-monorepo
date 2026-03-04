export type ReplayNavigationAction = 'first' | 'prev' | 'next' | 'last';

export interface ReplayNavigationState {
  showStartPosition: boolean;
  viewIndex: number;
  historyLength: number;
}

export interface ReplayKeyInput {
  key: string;
  targetTagName?: string | null;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

const FINAL_POSITION_INDEX = -1;

export function applyReplayNavigation(
  state: ReplayNavigationState,
  action: ReplayNavigationAction
): Pick<ReplayNavigationState, 'showStartPosition' | 'viewIndex'> {
  if (state.historyLength === 0) {
    return {
      showStartPosition: true,
      viewIndex: FINAL_POSITION_INDEX
    };
  }

  switch (action) {
    case 'first':
      return {
        showStartPosition: true,
        viewIndex: FINAL_POSITION_INDEX
      };

    case 'last':
      return {
        showStartPosition: false,
        viewIndex: FINAL_POSITION_INDEX
      };

    case 'prev':
      if (state.showStartPosition) {
        return {
          showStartPosition: true,
          viewIndex: FINAL_POSITION_INDEX
        };
      }
      if (state.viewIndex === FINAL_POSITION_INDEX) {
        return {
          showStartPosition: false,
          viewIndex: state.historyLength - 1
        };
      }
      if (state.viewIndex <= 0) {
        return {
          showStartPosition: true,
          viewIndex: FINAL_POSITION_INDEX
        };
      }
      return {
        showStartPosition: false,
        viewIndex: state.viewIndex - 1
      };

    case 'next':
      if (state.showStartPosition) {
        return {
          showStartPosition: false,
          viewIndex: 0
        };
      }
      if (state.viewIndex === FINAL_POSITION_INDEX) {
        return {
          showStartPosition: false,
          viewIndex: FINAL_POSITION_INDEX
        };
      }
      if (state.viewIndex >= state.historyLength - 1) {
        return {
          showStartPosition: false,
          viewIndex: FINAL_POSITION_INDEX
        };
      }
      return {
        showStartPosition: false,
        viewIndex: state.viewIndex + 1
      };
  }
}

export function isReplayAtStart(state: ReplayNavigationState): boolean {
  return state.historyLength === 0 || state.showStartPosition;
}

export function isReplayAtEnd(state: ReplayNavigationState): boolean {
  return (
    state.historyLength === 0 ||
    (!state.showStartPosition && state.viewIndex === FINAL_POSITION_INDEX)
  );
}

export function getReplayActionFromKey(input: ReplayKeyInput): ReplayNavigationAction | null {
  const tagName = input.targetTagName?.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return null;
  }
  if (input.metaKey || input.ctrlKey || input.altKey) {
    return null;
  }

  switch (input.key) {
    case 'ArrowLeft':
      return 'prev';
    case 'ArrowRight':
      return 'next';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

export function syncStartPositionWithHistory(
  showStartPosition: boolean,
  historyViewIndex: number
): boolean {
  return historyViewIndex === FINAL_POSITION_INDEX ? showStartPosition : false;
}
