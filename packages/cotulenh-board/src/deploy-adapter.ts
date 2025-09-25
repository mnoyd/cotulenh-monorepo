import { HeadlessState } from './state.js';
import * as cg from './types.js';
import { read as fenRead } from './fen.js';

/**
 * Adapter to bridge between cotulenh-board and cotulenh-core deploy sessions
 */
export class DeploySessionAdapter {
  constructor(private state: HeadlessState) {}

  /**
   * Start a deploy session from a stack square
   */
  startDeploy(square: cg.Key): boolean {
    if (!this.state.core) {
      console.warn('No core instance available for deploy session');
      return false;
    }

    try {
      // Start deploy session in core
      const coreSession = this.state.core.startDeploy(square);

      // Adapt core session to board format
      this.state.deploySession = this.adaptCoreSession(coreSession, square);

      return true;
    } catch (error) {
      console.error('Failed to start deploy session:', error);
      return false;
    }
  }

  /**
   * Execute a deploy step
   */
  deployStep(move: cg.DeployMove): cg.DeployStepResult {
    if (!this.state.core || !this.state.deploySession) {
      return {
        success: false,
        isComplete: false,
        remainingPieces: [],
      };
    }

    try {
      // Execute deploy step in core
      const result = this.state.core.deployStep(move);

      if (result) {
        // Update board state from core
        this.syncBoardFromCore();

        // Update deploy session state
        const coreSession = this.state.core.getDeploySession();
        if (coreSession) {
          this.state.deploySession = this.adaptCoreSession(coreSession, this.state.deploySession.stackSquare);
        }

        // Check if deploy is complete
        const isComplete = !this.state.core.isDeployActive();
        if (isComplete) {
          this.state.deploySession = undefined;
        }

        return {
          success: true,
          isComplete,
          remainingPieces: this.state.deploySession?.remainingPieces || [],
        };
      }

      return {
        success: false,
        isComplete: false,
        remainingPieces: this.state.deploySession?.remainingPieces || [],
      };
    } catch (error) {
      console.error('Failed to execute deploy step:', error);
      return {
        success: false,
        isComplete: false,
        remainingPieces: [],
      };
    }
  }

  /**
   * Handle stay move (piece remains on stack)
   */
  stayMove(pieceType: cg.Role): cg.DeployStepResult {
    if (!this.state.core || !this.state.deploySession) {
      return {
        success: false,
        isComplete: false,
        remainingPieces: [],
      };
    }

    try {
      // Execute stay move in core using special notation
      const stayNotation = `${pieceType.charAt(0).toUpperCase()}<`;
      const result = this.state.core.deployStep(stayNotation);

      if (result) {
        // Update deploy session state
        const coreSession = this.state.core.getDeploySession();
        if (coreSession) {
          this.state.deploySession = this.adaptCoreSession(coreSession, this.state.deploySession.stackSquare);
        }

        // Check if deploy is complete
        const isComplete = !this.state.core.isDeployActive();
        if (isComplete) {
          this.state.deploySession = undefined;
        }

        return {
          success: true,
          isComplete,
          remainingPieces: this.state.deploySession?.remainingPieces || [],
        };
      }

      return {
        success: false,
        isComplete: false,
        remainingPieces: this.state.deploySession?.remainingPieces || [],
      };
    } catch (error) {
      console.error('Failed to execute stay move:', error);
      return {
        success: false,
        isComplete: false,
        remainingPieces: [],
      };
    }
  }

  /**
   * Complete the current deploy session
   */
  completeDeploy(): void {
    if (this.state.core && this.state.deploySession) {
      try {
        this.state.core.completeDeploy();
        this.syncBoardFromCore();
        this.state.deploySession = undefined;
      } catch (error) {
        console.error('Failed to complete deploy session:', error);
      }
    }
  }

  /**
   * Check if deploy session is active
   */
  isDeployActive(): boolean {
    return this.state.deploySession?.isActive ?? false;
  }

  /**
   * Get remaining pieces that can be deployed
   */
  getRemainingPieces(): cg.Piece[] {
    return this.state.deploySession?.remainingPieces ?? [];
  }

  /**
   * Adapt core deploy session to board format
   */
  private adaptCoreSession(coreSession: any, stackSquare: cg.Key): cg.DeploySession {
    // Convert core pieces to board pieces
    const remainingPieces = (coreSession.remainingPieces || []).map((piece: any) => ({
      role: piece.type as cg.Role,
      color: piece.color as cg.Color,
      promoted: piece.heroic || false,
      carrying: piece.carrying
        ? piece.carrying.map((p: any) => ({
            role: p.type as cg.Role,
            color: p.color as cg.Color,
            promoted: p.heroic || false,
          }))
        : undefined,
    }));

    // Get available piece types
    const availablePieceTypes = (coreSession.availablePieceTypes || []) as cg.Role[];

    return {
      isActive: coreSession.isActive,
      stackSquare,
      turn: coreSession.turn as cg.Color,
      remainingPieces,
      availablePieceTypes,
    };
  }

  /**
   * Sync board pieces with core state
   */
  private syncBoardFromCore(): void {
    if (this.state.core) {
      try {
        const fen = this.state.core.fen();
        this.state.pieces = fenRead(fen);
        this.state.turnColor = this.state.core.turn() as cg.Color;
      } catch (error) {
        console.error('Failed to sync board from core:', error);
      }
    }
  }
}
