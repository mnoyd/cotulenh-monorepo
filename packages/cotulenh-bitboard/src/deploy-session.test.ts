/**
 * Tests for Deploy Session Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DeploySessionManager,
  createDeploySession,
  isDeploySessionComplete
} from './deploy-session';
import type { StackData } from './stack-manager';
import type { Piece } from './types';

describe('DeploySession', () => {
  describe('createDeploySession', () => {
    it('should create a deploy session from a stack', () => {
      const carrier: Piece = { type: 'i', color: 'r' };
      const carried: Piece[] = [
        { type: 't', color: 'r' },
        { type: 'm', color: 'r' }
      ];
      const stack: StackData = {
        square: 10,
        carrier,
        carried
      };

      const session = createDeploySession(10, stack, 'r');

      expect(session.stackSquare).toBe(10);
      expect(session.turn).toBe('r');
      expect(session.remainingPieces).toHaveLength(3); // carrier + 2 carried
      expect(session.deployedMoves).toHaveLength(0);
      expect(session.originalStack).toEqual(stack);
    });

    it('should include all pieces in remaining pieces', () => {
      const carrier: Piece = { type: 'i', color: 'r', heroic: true };
      const carried: Piece[] = [{ type: 't', color: 'r' }];
      const stack: StackData = {
        square: 20,
        carrier,
        carried
      };

      const session = createDeploySession(20, stack, 'r');

      expect(session.remainingPieces).toContainEqual({ type: 'i', color: 'r', heroic: true });
      expect(session.remainingPieces).toContainEqual({ type: 't', color: 'r' });
    });
  });

  describe('isDeploySessionComplete', () => {
    it('should return false when pieces remain', () => {
      const carrier: Piece = { type: 'i', color: 'r' };
      const stack: StackData = {
        square: 10,
        carrier,
        carried: []
      };

      const session = createDeploySession(10, stack, 'r');
      expect(isDeploySessionComplete(session)).toBe(false);
    });

    it('should return true when all pieces deployed', () => {
      const carrier: Piece = { type: 'i', color: 'r' };
      const stack: StackData = {
        square: 10,
        carrier,
        carried: []
      };

      const session = createDeploySession(10, stack, 'r');
      session.remainingPieces = []; // Simulate all pieces deployed

      expect(isDeploySessionComplete(session)).toBe(true);
    });
  });
});

describe('DeploySessionManager', () => {
  let manager: DeploySessionManager;
  let testStack: StackData;

  beforeEach(() => {
    manager = new DeploySessionManager();
    testStack = {
      square: 15,
      carrier: { type: 'i', color: 'r' },
      carried: [{ type: 't', color: 'r' }]
    };
  });

  describe('Session Initiation and Completion', () => {
    it('should initiate a new deploy session', () => {
      manager.initiateSession(15, testStack, 'r');

      expect(manager.hasActiveSession()).toBe(true);
      const session = manager.getActiveSession();
      expect(session).not.toBeNull();
      expect(session?.stackSquare).toBe(15);
    });

    it('should track origin square correctly', () => {
      manager.initiateSession(15, testStack, 'r');
      const session = manager.getActiveSession();
      expect(session?.stackSquare).toBe(15);
    });

    it('should track turn correctly', () => {
      manager.initiateSession(15, testStack, 'r');
      const session = manager.getActiveSession();
      expect(session?.turn).toBe('r');
    });

    it('should initialize with empty deployed moves', () => {
      manager.initiateSession(15, testStack, 'r');
      const session = manager.getActiveSession();
      expect(session?.deployedMoves).toHaveLength(0);
    });

    it('should preserve original stack for restoration', () => {
      manager.initiateSession(15, testStack, 'r');
      const session = manager.getActiveSession();
      expect(session?.originalStack).toEqual(testStack);
    });

    it('should throw error if session already active', () => {
      manager.initiateSession(15, testStack, 'r');

      expect(() => {
        manager.initiateSession(20, testStack, 'r');
      }).toThrow('Cannot initiate a new deploy session while one is already active');
    });

    it('should complete session when all pieces deployed', () => {
      manager.initiateSession(15, testStack, 'r');

      // Deploy all pieces
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      manager.deployPiece({ type: 't', color: 'r' }, 26);

      expect(manager.canCommit()).toBe(true);
      const completedSession = manager.commit();
      expect(completedSession.deployedMoves).toHaveLength(2);
      expect(manager.hasActiveSession()).toBe(false);
    });
  });

  describe('Deploying Pieces One by One', () => {
    beforeEach(() => {
      manager.initiateSession(15, testStack, 'r');
    });

    it('should deploy a piece and record the move', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      manager.deployPiece(piece, 25);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves).toHaveLength(1);
      expect(session?.deployedMoves[0]).toMatchObject({
        piece,
        from: 15,
        to: 25
      });
    });

    it('should deploy pieces to different squares', () => {
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      manager.deployPiece({ type: 't', color: 'r' }, 26);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves).toHaveLength(2);
      expect(session?.deployedMoves[0].to).toBe(25);
      expect(session?.deployedMoves[1].to).toBe(26);
    });

    it('should remove piece from remaining pieces after deploy', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      const sessionBefore = manager.getActiveSession();
      const countBefore = sessionBefore?.remainingPieces.length || 0;

      manager.deployPiece(piece, 25);

      const sessionAfter = manager.getActiveSession();
      expect(sessionAfter?.remainingPieces.length).toBe(countBefore - 1);
    });

    it('should track remaining pieces correctly after multiple deploys', () => {
      expect(manager.getActiveSession()?.remainingPieces.length).toBe(2);

      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      expect(manager.getActiveSession()?.remainingPieces.length).toBe(1);

      manager.deployPiece({ type: 't', color: 'r' }, 26);
      expect(manager.getActiveSession()?.remainingPieces.length).toBe(0);
    });

    it('should record captured piece when deploying', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      const captured: Piece = { type: 't', color: 'b' };

      manager.deployPiece(piece, 25, captured);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves[0].captured).toEqual(captured);
    });

    it('should handle deploy without capture', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      manager.deployPiece(piece, 25);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves[0].captured).toBeUndefined();
    });

    it('should throw error if piece not available', () => {
      const piece: Piece = { type: 'c', color: 'r' }; // Not in stack

      expect(() => {
        manager.deployPiece(piece, 25);
      }).toThrow('Piece c is not available to deploy');
    });

    it('should throw error if no active session', () => {
      manager.clear();

      expect(() => {
        manager.deployPiece({ type: 'i', color: 'r' }, 25);
      }).toThrow('No active deploy session');
    });

    it('should handle heroic pieces correctly', () => {
      const heroicStack: StackData = {
        square: 20,
        carrier: { type: 'i', color: 'r', heroic: true },
        carried: []
      };

      manager.clear();
      manager.initiateSession(20, heroicStack, 'r');
      manager.deployPiece({ type: 'i', color: 'r', heroic: true }, 30);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves[0].piece.heroic).toBe(true);
    });
  });

  describe('Undo Within Session', () => {
    beforeEach(() => {
      manager.initiateSession(15, testStack, 'r');
    });

    it('should undo the last deploy move', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      manager.deployPiece(piece, 25);

      const undone = manager.undoLastDeploy();

      expect(undone).toBeDefined();
      expect(undone?.piece).toEqual(piece);
      expect(undone?.to).toBe(25);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves).toHaveLength(0);
    });

    it('should return piece to remaining pieces', () => {
      const piece: Piece = { type: 'i', color: 'r' };
      const countBefore = manager.getActiveSession()?.remainingPieces.length || 0;

      manager.deployPiece(piece, 25);
      manager.undoLastDeploy();

      const session = manager.getActiveSession();
      expect(session?.remainingPieces.length).toBe(countBefore);
    });

    it('should undo multiple deploy steps in reverse order', () => {
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      manager.deployPiece({ type: 't', color: 'r' }, 26);

      const undone1 = manager.undoLastDeploy();
      expect(undone1?.piece.type).toBe('t');
      expect(undone1?.to).toBe(26);

      const undone2 = manager.undoLastDeploy();
      expect(undone2?.piece.type).toBe('i');
      expect(undone2?.to).toBe(25);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves).toHaveLength(0);
      expect(session?.remainingPieces.length).toBe(2);
    });

    it('should restore captured piece information when undoing', () => {
      const captured: Piece = { type: 't', color: 'b' };
      manager.deployPiece({ type: 'i', color: 'r' }, 25, captured);

      const undone = manager.undoLastDeploy();
      expect(undone?.captured).toEqual(captured);
    });

    it('should return undefined if no moves to undo', () => {
      const undone = manager.undoLastDeploy();
      expect(undone).toBeUndefined();
    });

    it('should return undefined if no active session', () => {
      manager.clear();
      const undone = manager.undoLastDeploy();
      expect(undone).toBeUndefined();
    });

    it('should allow undo after partial deploy', () => {
      manager.deployPiece({ type: 'i', color: 'r' }, 25);

      expect(manager.getActiveSession()?.remainingPieces.length).toBe(1);

      manager.undoLastDeploy();

      expect(manager.getActiveSession()?.remainingPieces.length).toBe(2);
      expect(manager.getActiveSession()?.deployedMoves.length).toBe(0);
    });
  });

  describe('Commit Validation', () => {
    it('should return false when pieces remain', () => {
      manager.initiateSession(15, testStack, 'r');
      expect(manager.canCommit()).toBe(false);
    });

    it('should return false after partial deploy', () => {
      manager.initiateSession(15, testStack, 'r');
      manager.deployPiece({ type: 'i', color: 'r' }, 25);

      expect(manager.canCommit()).toBe(false);
    });

    it('should return true when all pieces deployed', () => {
      manager.initiateSession(15, testStack, 'r');

      // Deploy all pieces
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      manager.deployPiece({ type: 't', color: 'r' }, 26);

      expect(manager.canCommit()).toBe(true);
    });

    it('should return false if no active session', () => {
      expect(manager.canCommit()).toBe(false);
    });

    it('should validate all pieces are deployed before commit', () => {
      manager.initiateSession(15, testStack, 'r');
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      // Only deployed 1 of 2 pieces

      expect(() => {
        manager.commit();
      }).toThrow('Cannot commit deploy session: not all pieces have been deployed');
    });
  });

  describe('Commit Session', () => {
    beforeEach(() => {
      manager.initiateSession(15, testStack, 'r');
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      manager.deployPiece({ type: 't', color: 'r' }, 26);
    });

    it('should commit the session and clear active session', () => {
      const session = manager.commit();

      expect(session).toBeDefined();
      expect(session.deployedMoves).toHaveLength(2);
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should return completed session data', () => {
      const session = manager.commit();

      expect(session.stackSquare).toBe(15);
      expect(session.turn).toBe('r');
      expect(session.deployedMoves.length).toBe(2);
      expect(session.remainingPieces.length).toBe(0);
    });

    it('should throw error if not all pieces deployed', () => {
      manager.undoLastDeploy(); // Remove one deploy

      expect(() => {
        manager.commit();
      }).toThrow('Cannot commit deploy session: not all pieces have been deployed');
    });

    it('should throw error if no active session', () => {
      manager.commit(); // First commit

      expect(() => {
        manager.commit(); // Second commit
      }).toThrow('No active deploy session to commit');
    });

    it('should preserve deploy move history in committed session', () => {
      const session = manager.commit();

      expect(session.deployedMoves[0].from).toBe(15);
      expect(session.deployedMoves[0].to).toBe(25);
      expect(session.deployedMoves[1].from).toBe(15);
      expect(session.deployedMoves[1].to).toBe(26);
    });
  });

  describe('Cancel and Restore', () => {
    beforeEach(() => {
      manager.initiateSession(15, testStack, 'r');
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
    });

    it('should cancel the session and return original stack', () => {
      const originalStack = manager.cancel();

      expect(originalStack).toEqual(testStack);
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should restore original stack data correctly', () => {
      const originalStack = manager.cancel();

      expect(originalStack.square).toBe(15);
      expect(originalStack.carrier).toEqual({ type: 'i', color: 'r' });
      expect(originalStack.carried).toHaveLength(1);
      expect(originalStack.carried[0]).toEqual({ type: 't', color: 'r' });
    });

    it('should cancel after partial deploy', () => {
      // Already deployed one piece in beforeEach
      expect(manager.getActiveSession()?.deployedMoves.length).toBe(1);

      const originalStack = manager.cancel();

      expect(originalStack).toEqual(testStack);
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should cancel before any deploys', () => {
      manager.clear();
      manager.initiateSession(15, testStack, 'r');

      const originalStack = manager.cancel();

      expect(originalStack).toEqual(testStack);
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should throw error if no active session', () => {
      manager.cancel(); // First cancel

      expect(() => {
        manager.cancel(); // Second cancel
      }).toThrow('No active deploy session to cancel');
    });

    it('should discard all deployed moves on cancel', () => {
      manager.deployPiece({ type: 't', color: 'r' }, 26);

      expect(manager.getActiveSession()?.deployedMoves.length).toBe(2);

      manager.cancel();

      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should preserve original stack even after multiple deploys', () => {
      manager.deployPiece({ type: 't', color: 'r' }, 26);

      const originalStack = manager.cancel();

      // Original stack should be unchanged
      expect(originalStack.carrier).toEqual({ type: 'i', color: 'r' });
      expect(originalStack.carried).toHaveLength(1);
    });
  });

  describe('Complex Deploy Scenarios', () => {
    it('should handle deploy session with multiple pieces', () => {
      const largeStack: StackData = {
        square: 30,
        carrier: { type: 'i', color: 'r' },
        carried: [
          { type: 't', color: 'r' },
          { type: 'm', color: 'r' },
          { type: 'e', color: 'r' }
        ]
      };

      manager.initiateSession(30, largeStack, 'r');

      expect(manager.getActiveSession()?.remainingPieces.length).toBe(4);

      manager.deployPiece({ type: 'i', color: 'r' }, 40);
      manager.deployPiece({ type: 't', color: 'r' }, 41);
      manager.deployPiece({ type: 'm', color: 'r' }, 42);
      manager.deployPiece({ type: 'e', color: 'r' }, 43);

      expect(manager.canCommit()).toBe(true);
      const session = manager.commit();
      expect(session.deployedMoves.length).toBe(4);
    });

    it('should handle undo and redeploy', () => {
      manager.initiateSession(15, testStack, 'r');

      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      manager.undoLastDeploy();
      manager.deployPiece({ type: 'i', color: 'r' }, 30); // Deploy to different square

      const session = manager.getActiveSession();
      expect(session?.deployedMoves.length).toBe(1);
      expect(session?.deployedMoves[0].to).toBe(30);
    });

    it('should maintain session state through multiple operations', () => {
      manager.initiateSession(15, testStack, 'r');

      // Deploy, undo, deploy again
      manager.deployPiece({ type: 'i', color: 'r' }, 25);
      manager.deployPiece({ type: 't', color: 'r' }, 26);
      manager.undoLastDeploy();
      manager.deployPiece({ type: 't', color: 'r' }, 27);

      const session = manager.getActiveSession();
      expect(session?.deployedMoves.length).toBe(2);
      expect(session?.deployedMoves[0].to).toBe(25);
      expect(session?.deployedMoves[1].to).toBe(27);
      expect(manager.canCommit()).toBe(true);
    });
  });
});
