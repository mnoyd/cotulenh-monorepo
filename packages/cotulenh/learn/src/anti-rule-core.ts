import { CoTuLenh, RED } from '@cotulenh/core';
import type {
  Square,
  MoveResult,
  Color,
  Piece,
  DeployStateView,
  GameStateMetadata,
  AirDefenseInfluence,
  PieceSymbol,
  InternalMove
} from '@cotulenh/core';

export interface AntiRuleOptions {
  legalMoves?: boolean;
  infiniteTurnFor?: Color | null;
  /** Skip automatic Last Guard promotion */
  skipLastGuard?: boolean;
}

/**
 * AntiRuleCore - A wrapper around CoTuLenh for learning purposes.
 *
 * Features:
 * - Skip legal move validation (allow any move)
 * - Infinite moves for a specific color (turn doesn't change)
 *
 * Useful for:
 * - Learning piece movement without game rules
 * - Testing scenarios
 * - Demonstrating specific positions
 */
export class AntiRuleCore {
  readonly #game: CoTuLenh;
  readonly #options: Required<AntiRuleOptions>;

  constructor(fen?: string, options: AntiRuleOptions = {}) {
    this.#game = new CoTuLenh(fen, {
      skipLastGuardPromotion: options.skipLastGuard ?? false
    });
    this.#options = {
      legalMoves: options.legalMoves ?? false,
      infiniteTurnFor: options.infiniteTurnFor !== undefined ? options.infiniteTurnFor : RED,
      skipLastGuard: options.skipLastGuard ?? false
    };
  }

  fen(): string {
    return this.#game.fen();
  }

  turn(): Color {
    return this.#game.turn();
  }

  move(
    move:
      | string
      | {
          from: Square;
          to: Square;
          piece?: PieceSymbol;
          stay?: boolean;
          deploy?: boolean;
        }
      | InternalMove,
    options?: { strict?: boolean; autoCommit?: boolean }
  ): MoveResult | null {
    const result = this.#game.move(move, {
      ...options,
      legal: this.#options.legalMoves
    });

    if (result && this.#options.infiniteTurnFor) {
      this.#game.setMetadata({
        turn: this.#options.infiniteTurnFor
      });
    }

    return result;
  }

  moves(options?: {
    verbose?: boolean;
    square?: Square;
    pieceType?: PieceSymbol;
  }): string[] | MoveResult[] {
    return this.#game.moves({
      ...options,
      legal: this.#options.legalMoves
    });
  }

  undo(): void {
    this.#game.undo();
    if (this.#options.infiniteTurnFor) {
      this.#game.setMetadata({
        turn: this.#options.infiniteTurnFor
      });
    }
  }

  get(square: Square): Piece | undefined {
    return this.#game.get(square);
  }

  put(piece: Piece, square: Square): boolean {
    return this.#game.put(piece, square);
  }

  remove(square: Square): Piece | undefined {
    return this.#game.remove(square);
  }

  clear(options?: { preserveHeaders?: boolean }): void {
    this.#game.clear(options);
  }

  load(fen: string, options?: { skipValidation?: boolean; preserveHeaders?: boolean }): void {
    this.#game.load(fen, options);
    if (this.#options.infiniteTurnFor) {
      this.#game.setMetadata({
        turn: this.#options.infiniteTurnFor
      });
    }
  }

  getSession(): ReturnType<CoTuLenh['getSession']> {
    return this.#game.getSession();
  }

  setSession(session: Parameters<CoTuLenh['setSession']>[0]): void {
    this.#game.setSession(session);
  }

  getDeployState(): DeployStateView | null {
    return this.#game.getDeployState();
  }

  commitSession(): { success: boolean; reason?: string; result?: MoveResult } {
    const result = this.#game.commitSession();
    if (result.success && this.#options.infiniteTurnFor) {
      this.#game.setMetadata({
        turn: this.#options.infiniteTurnFor
      });
    }
    return result;
  }

  cancelSession(): void {
    this.#game.cancelSession();
  }

  canCommitSession(): boolean {
    return this.#game.canCommitSession();
  }

  history(): string[];
  history(options: { verbose: true }): MoveResult[];
  history(options: { verbose: false }): string[];
  history(options?: { verbose?: boolean }): string[] | MoveResult[] {
    return this.#game.history(options as { verbose?: boolean });
  }

  getMetadata(): GameStateMetadata {
    return this.#game.getMetadata();
  }

  setMetadata(metadata: Partial<GameStateMetadata>): void {
    this.#game.setMetadata(metadata);
  }

  getAirDefenseInfluence(): AirDefenseInfluence {
    return this.#game.getAirDefenseInfluence();
  }

  isCheck(): boolean {
    return this.#game.isCheck();
  }

  isGameOver(): boolean {
    return this.#game.isGameOver();
  }

  isCheckmate(): boolean {
    return this.#game.isCheckmate();
  }

  isStalemate(): boolean {
    return this.#game.isStalemate();
  }

  isDraw(): boolean {
    return this.#game.isDraw();
  }

  isDrawByFiftyMoves(): boolean {
    return this.#game.isDrawByFiftyMoves();
  }

  isThreefoldRepetition(): boolean {
    return this.#game.isThreefoldRepetition();
  }

  isCommanderCaptured(): boolean {
    return this.#game.isCommanderCaptured();
  }

  isCommanderInDanger(color: Color): boolean {
    return this.#game.isCommanderInDanger(color);
  }

  get innerGame(): CoTuLenh {
    return this.#game;
  }
}

export function createAntiRuleCore(fen?: string, options?: AntiRuleOptions): AntiRuleCore {
  return new AntiRuleCore(fen, options);
}
