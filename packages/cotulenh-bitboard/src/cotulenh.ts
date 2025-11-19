/**
 * CoTuLenh - Main game class with bitboard implementation
 *
 * This class provides the same public API as @repo/cotulenh-core but uses
 * bitboard data structures internally for improved performance.
 *
 * API compatibility is maintained for seamless swapping between implementations.
 */

import { BitboardPosition } from './position';
import {
  parseFEN,
  generateFEN,
  DEFAULT_POSITION,
  algebraicToSquare,
  squareToAlgebraic
} from './fen';
import type { Color, PieceSymbol, Piece, Square } from './types';
import { generateLegalMoves, invalidateMoveCache, MOVE_FLAGS } from './move-generator';
import type { Move as InternalMove } from './move-generator';
import { isCheck, isCheckmate, trackCommanderPositions } from './check-detection';
import type { DeploySession } from './deploy-session';
import { BASE_AIRDEFENSE_CONFIG } from './air-defense';

/**
 * History entry for undo functionality
 */
interface HistoryEntry {
  // Store complete position state for undo
  position: BitboardPosition;
  turn: Color;
  halfMoves: number;
  moveNumber: number;
  deploySession: DeploySession | null;
}

/**
 * Public Move class (similar to chess.js)
 * Represents a move with all its properties
 */
export class Move {
  color: Color;
  from: Square;
  to: Square;
  piece: Piece;
  captured?: Piece;
  flags: string;
  san?: string;
  lan?: string;
  before: string;
  after: string;

  constructor(data: {
    color: Color;
    from: Square;
    to: Square;
    piece: Piece;
    captured?: Piece;
    flags: string;
    san?: string;
    lan?: string;
    before: string;
    after: string;
  }) {
    this.color = data.color;
    this.from = data.from;
    this.to = data.to;
    this.piece = data.piece;
    this.captured = data.captured;
    this.flags = data.flags;
    this.san = data.san;
    this.lan = data.lan;
    this.before = data.before;
    this.after = data.after;
  }

  isCapture(): boolean {
    return this.flags.includes('c') || this.flags.includes('s');
  }

  isStayCapture(): boolean {
    return this.flags.includes('s');
  }

  isDeploy(): boolean {
    return this.flags.includes('d');
  }

  isCombination(): boolean {
    return this.flags.includes('&');
  }
}

/**
 * Main CoTuLenh class - bitboard implementation with same API as cotulenh-core
 */
export class CoTuLenh {
  private position: BitboardPosition;
  private _turn: Color;
  private _halfMoves: number;
  private _moveNumber: number;
  private _history: HistoryEntry[];
  private _header: Map<string, string>;
  private _comments: Map<string, string>;
  private _positionCount: Map<string, number>;
  private _deploySession: DeploySession | null;
  private _commanders: { r: number; b: number };

  /**
   * Creates a new CoTuLenh instance
   * @param fen - Optional FEN string to initialize position (defaults to starting position)
   */
  constructor(fen: string = DEFAULT_POSITION) {
    this.position = new BitboardPosition();
    this._turn = 'r';
    this._halfMoves = 0;
    this._moveNumber = 1;
    this._history = [];
    this._header = new Map();
    this._comments = new Map();
    this._positionCount = new Map();
    this._deploySession = null;
    this._commanders = { r: -1, b: -1 };

    this.load(fen);
  }

  /**
   * Clears the board by removing all pieces and resetting the game state
   * @param options - Clear options
   * @param options.preserveHeaders - Whether to preserve existing headers
   */
  clear({ preserveHeaders = false }: { preserveHeaders?: boolean } = {}): void {
    this.position.clear();
    this._turn = 'r';
    this._halfMoves = 0;
    this._moveNumber = 1;
    this._history = [];
    this._comments = new Map();
    this._positionCount = new Map();
    this._deploySession = null;
    this._commanders = { r: -1, b: -1 };

    if (!preserveHeaders) {
      this._header = new Map();
    }

    // Clear cache
    invalidateMoveCache();
  }

  /**
   * Loads a position from a FEN string
   * @param fen - The FEN string representing the position to load
   * @param options - Loading options
   * @param options.skipValidation - Whether to skip FEN validation
   * @param options.preserveHeaders - Whether to preserve existing headers
   */
  load(
    fen: string,
    { preserveHeaders = false }: { skipValidation?: boolean; preserveHeaders?: boolean } = {}
  ): void {
    // Clear current state
    this.clear({ preserveHeaders });

    // Parse FEN and populate position
    const parsed = parseFEN(fen, this.position);

    // Set position from parsed FEN
    this._turn = parsed.turn;
    this._halfMoves = parsed.halfMoves;
    this._moveNumber = parsed.moveNumber;

    // Track commander positions
    const commanders = trackCommanderPositions(this.position);
    this._commanders = { r: commanders.red, b: commanders.blue };

    // Update position counts
    this._updatePositionCounts();

    // Clear cache
    invalidateMoveCache();
  }

  /**
   * Generates the FEN string representing the current board position
   * @returns The FEN string for the current position
   */
  fen(): string {
    return generateFEN(
      this.position,
      this._turn,
      this._halfMoves,
      this._moveNumber,
      this._deploySession
    );
  }

  /**
   * Updates position counts for threefold repetition detection
   * @private
   */
  private _updatePositionCounts(): void {
    const fen = this.fen();
    const count = this._positionCount.get(fen) || 0;
    this._positionCount.set(fen, count + 1);

    // Update setup flags
    this._header.set('SetUp', '1');
    this._header.set('FEN', fen);
  }

  /**
   * Retrieves a piece from the specified square on the board.
   * Can optionally search for a specific piece type within a stack of pieces.
   * @param square - The square to examine, either as algebraic notation (e.g., 'e4') or internal coordinate
   * @param pieceType - Optional piece type to search for specifically within a stack
   * @returns The piece at the square, or undefined if no piece is found or the specified type is not present
   */
  get(square: Square | number, pieceType?: PieceSymbol): Piece | undefined {
    const sq = typeof square === 'number' ? square : algebraicToSquare(square);
    if (sq === -1) return undefined;

    const pieceAtSquare = this.position.getPieceAt(sq);
    if (!pieceAtSquare) return undefined;

    // If no specific piece type requested or the piece matches the requested type, return it
    if (!pieceType || pieceAtSquare.type === pieceType) {
      return pieceAtSquare;
    }

    // Check if the requested piece is being carried in a stack
    if (pieceAtSquare.carrying && pieceAtSquare.carrying.length > 0) {
      return pieceAtSquare.carrying.find((p) => p.type === pieceType);
    }

    return undefined;
  }

  /**
   * Places a piece on the specified square of the board.
   * Validates the piece and square before placement, ensuring the operation is legal.
   * @param piece - The piece to place
   * @param square - The square to place the piece on
   * @param allowCombine - Whether to allow combining with existing pieces (for stacks)
   * @returns True if the piece was successfully placed, false otherwise
   */
  put(piece: Piece, square: Square, allowCombine = false): boolean {
    const sq = algebraicToSquare(square);
    if (sq === -1) return false;

    // Check terrain restrictions
    if (!this.position.canPlacePieceOnSquare(piece, sq)) {
      return false;
    }

    // Handle commander limit - only one commander per color
    if (piece.type === 'c') {
      const existingCommanderSq = this._commanders[piece.color];
      if (existingCommanderSq !== -1 && existingCommanderSq !== sq) {
        return false; // Already have a commander of this color
      }
    }

    // Check if we're replacing an enemy commander
    const existingPiece = this.position.getPieceAt(sq);
    if (existingPiece && existingPiece.type === 'c' && existingPiece.color !== piece.color) {
      const enemyColor = existingPiece.color;
      if (this._commanders[enemyColor] === sq) {
        this._commanders[enemyColor] = -1;
      }
    }

    // Handle combination if requested
    if (allowCombine && existingPiece) {
      // TODO: Implement piece combination logic
      // For now, just replace the piece
      this.position.removePiece(sq);
    }

    // Place the piece
    this.position.placePiece(piece, sq);

    // Update commander tracking
    if (piece.type === 'c') {
      this._commanders[piece.color] = sq;
    }

    // Update air defense if this is an anti-air piece
    if (BASE_AIRDEFENSE_CONFIG[piece.type]) {
      this.position.recalculateAirDefenseZones();
    }

    // Clear cache
    invalidateMoveCache();

    return true;
  }

  /**
   * Removes a piece from the specified square on the board.
   * Can optionally target a specific piece type within a stack of pieces.
   * @param square - The square to remove the piece from, in algebraic notation (e.g., 'e4')
   * @returns The removed piece object, or undefined if no piece was found
   */
  remove(square: Square): Piece | undefined {
    const sq = algebraicToSquare(square);
    if (sq === -1) return undefined;

    const piece = this.position.removePiece(sq);
    if (!piece) return undefined;

    // Update commander tracking
    if (piece.type === 'c' && this._commanders[piece.color] === sq) {
      this._commanders[piece.color] = -1;
    }

    // Update air defense if this was an anti-air piece
    if (BASE_AIRDEFENSE_CONFIG[piece.type]) {
      this.position.recalculateAirDefenseZones();
    }

    // Clear cache
    invalidateMoveCache();

    return piece;
  }

  /**
   * Generates all legal moves available in the current position.
   * Can be filtered by square, piece type, or return format (verbose vs. algebraic notation).
   * @param options - Configuration options for move generation
   * @param options.square - Generate moves only for pieces on this specific square
   * @param options.pieceType - Generate moves only for this specific piece type
   * @param options.verbose - If true, returns Move objects; if false, returns SAN strings
   * @returns An array of legal moves, either as Move objects or algebraic notation strings
   */
  moves(options?: {
    verbose?: boolean;
    square?: Square;
    pieceType?: PieceSymbol;
  }): string[] | Move[] {
    const { verbose = false, square, pieceType } = options || {};

    // Convert square to index if provided
    const squareIndex = square ? algebraicToSquare(square) : undefined;
    if (square && squareIndex === -1) {
      return []; // Invalid square
    }

    // Generate legal moves using the move generator
    const internalMoves = generateLegalMoves(this.position, this._turn, {
      square: squareIndex,
      pieceType
    });

    if (verbose) {
      // Return Move objects
      return internalMoves.map((move) => this._convertToPublicMove(move));
    } else {
      // Return SAN strings
      return internalMoves.map((move) => this._moveToSan(move));
    }
  }

  /**
   * Executes a move on the board, accepting either algebraic notation or move object format.
   * Validates the move legality before execution and updates the game state accordingly.
   * @param move - The move to execute, either as SAN string (e.g., 'Nf3') or move object with from/to squares
   * @returns The executed Move object, or null if the move was invalid
   */
  move(move: string | { from: string; to: string; piece?: PieceSymbol }): Move | null {
    let internalMove: InternalMove | null = null;

    if (typeof move === 'string') {
      // Parse SAN notation
      internalMove = this._moveFromSan(move);
    } else {
      // Find matching move from legal moves
      const fromSq = algebraicToSquare(move.from);
      const toSq = algebraicToSquare(move.to);

      if (fromSq === -1 || toSq === -1) {
        return null; // Invalid squares
      }

      const legalMoves = generateLegalMoves(this.position, this._turn, {
        square: fromSq,
        pieceType: move.piece
      });

      // Find the matching move
      internalMove = legalMoves.find((m) => m.from === fromSq && m.to === toSq) || null;
    }

    if (!internalMove) {
      return null; // Invalid or illegal move
    }

    // Save state for history
    const beforeFEN = this.fen();

    // Execute the move
    this._makeMove(internalMove);

    // Capture after FEN
    const afterFEN = this.fen();

    // Create public Move object
    const publicMove = this._convertToPublicMove(internalMove, beforeFEN, afterFEN);

    return publicMove;
  }

  /**
   * Undoes the last move made on the board, restoring the previous position.
   * Reverts all changes including piece positions, game state, and move counters.
   */
  undo(): void {
    const lastEntry = this._history.pop();
    if (!lastEntry) {
      return; // No moves to undo
    }

    // Restore complete state from history
    this.position = lastEntry.position;
    this._turn = lastEntry.turn;
    this._halfMoves = lastEntry.halfMoves;
    this._moveNumber = lastEntry.moveNumber;
    this._deploySession = lastEntry.deploySession;

    // Update commander positions
    const commanders = trackCommanderPositions(this.position);
    this._commanders = { r: commanders.red, b: commanders.blue };

    // Clear cache
    invalidateMoveCache();
  }

  /**
   * Converts an internal move to a public Move object
   * @private
   */
  private _convertToPublicMove(move: InternalMove, beforeFEN?: string, afterFEN?: string): Move {
    const from = squareToAlgebraic(move.from);
    const to = squareToAlgebraic(move.to);

    // Convert flags to string
    let flagsStr = '';
    if (move.flags & MOVE_FLAGS.CAPTURE) flagsStr += 'c';
    if (move.flags & MOVE_FLAGS.STAY_CAPTURE) flagsStr += 's';
    if (move.flags & MOVE_FLAGS.COMBINATION) flagsStr += '&';
    if (move.flags & MOVE_FLAGS.DEPLOY) flagsStr += 'd';
    if (move.flags & MOVE_FLAGS.KAMIKAZE) flagsStr += 'k';

    return new Move({
      color: move.piece.color,
      from,
      to,
      piece: move.piece,
      captured: move.captured,
      flags: flagsStr,
      san: this._moveToSan(move),
      lan: this._moveToLan(move),
      before: beforeFEN || this.fen(),
      after: afterFEN || this.fen()
    });
  }

  /**
   * Converts a move to SAN notation
   * @private
   */
  private _moveToSan(move: InternalMove): string {
    const pieceChar = move.piece.type.toUpperCase();
    const from = squareToAlgebraic(move.from);
    const to = squareToAlgebraic(move.to);

    const isStayCapture = (move.flags & MOVE_FLAGS.STAY_CAPTURE) !== 0;
    const isNormalCapture = (move.flags & MOVE_FLAGS.CAPTURE) !== 0;

    if (isStayCapture) {
      // Stay capture notation: "Td2<d3" (piece at d2 stay-captures at d3)
      return `${pieceChar}${from}<${to}`;
    } else if (isNormalCapture) {
      // Normal capture notation: "Txd3"
      return `${pieceChar}x${to}`;
    } else {
      // Normal move notation: "Td3"
      return `${pieceChar}${to}`;
    }
  }

  /**
   * Converts a move to LAN notation
   * @private
   */
  private _moveToLan(move: InternalMove): string {
    // Simplified LAN generation
    const pieceChar = move.piece.type.toUpperCase();
    const from = squareToAlgebraic(move.from);
    const to = squareToAlgebraic(move.to);
    const capture = move.flags & MOVE_FLAGS.CAPTURE ? 'x' : '-';

    return `${pieceChar}${from}${capture}${to}`;
  }

  /**
   * Parses a SAN move string to find the matching internal move
   * @private
   */
  private _moveFromSan(san: string): InternalMove | null {
    // Check for stay capture notation: "Td2<d3" or "T<d3"
    const stayCaptureMatcher = /^([CITMEAGSFNH])([a-k](?:1[0-2]|[1-9]))?<([a-k](?:1[0-2]|[1-9]))$/;
    const stayMatch = san.match(stayCaptureMatcher);

    if (stayMatch) {
      const pieceType = stayMatch[1].toLowerCase() as PieceSymbol;
      const fromSquare = stayMatch[2]; // May be undefined
      const toSquare = stayMatch[3];

      // Find matching stay capture move
      const legalMoves = generateLegalMoves(this.position, this._turn);

      for (const move of legalMoves) {
        const isStayCapture = (move.flags & MOVE_FLAGS.STAY_CAPTURE) !== 0;

        if (
          isStayCapture &&
          move.piece.type === pieceType &&
          squareToAlgebraic(move.to) === toSquare
        ) {
          // If from square specified, check it matches
          if (fromSquare && squareToAlgebraic(move.from) !== fromSquare) {
            continue;
          }

          return move;
        }
      }

      return null; // No matching move found
    }

    // Simplified SAN parsing for other move types
    const legalMoves = generateLegalMoves(this.position, this._turn);

    // Try to match the SAN string
    for (const move of legalMoves) {
      if (this._moveToSan(move) === san) {
        return move;
      }
    }

    return null;
  }

  /**
   * Executes a move and updates game state
   * @private
   */
  private _makeMove(move: InternalMove): void {
    // Save current state to history
    const historyEntry: HistoryEntry = {
      position: this._clonePosition(),
      turn: this._turn,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber,
      deploySession: this._deploySession
    };
    this._history.push(historyEntry);

    const isStayCapture = (move.flags & MOVE_FLAGS.STAY_CAPTURE) !== 0;

    if (isStayCapture) {
      // Stay capture: piece stays at origin, target is removed

      // Remove captured piece from target square
      if (move.captured) {
        this.position.removePiece(move.to);
        this._halfMoves = 0; // Reset on capture
      }

      // Piece stays at origin (no movement needed)
      // No commander position update needed since piece didn't move
    } else {
      // Normal move or normal capture

      // Remove piece from source square
      const movingPiece = this.position.removePiece(move.from);
      if (!movingPiece) {
        throw new Error(`No piece at square ${move.from}`);
      }

      // Handle capture
      if (move.captured) {
        this.position.removePiece(move.to);
        this._halfMoves = 0; // Reset on capture
      } else {
        this._halfMoves++;
      }

      // Place piece at destination
      this.position.placePiece(movingPiece, move.to);

      // Update commander tracking
      if (movingPiece.type === 'c') {
        this._commanders[movingPiece.color] = move.to;
      }
    }

    // Switch turn
    this._turn = this._turn === 'r' ? 'b' : 'r';

    // Increment move number after blue's move
    if (this._turn === 'r') {
      this._moveNumber++;
    }

    // Update position counts
    this._updatePositionCounts();

    // Clear cache
    invalidateMoveCache();
  }

  /**
   * Clones the current position for history
   * @private
   */
  private _clonePosition(): BitboardPosition {
    // Create a deep copy of the position
    // This is a simplified implementation - full cloning would be more complex
    const cloned = new BitboardPosition();

    // Copy all bitboards
    cloned.commanders = { ...this.position.commanders };
    cloned.infantry = { ...this.position.infantry };
    cloned.tanks = { ...this.position.tanks };
    cloned.militia = { ...this.position.militia };
    cloned.engineers = { ...this.position.engineers };
    cloned.artillery = { ...this.position.artillery };
    cloned.antiAir = { ...this.position.antiAir };
    cloned.missiles = { ...this.position.missiles };
    cloned.airForce = { ...this.position.airForce };
    cloned.navy = { ...this.position.navy };
    cloned.headquarters = { ...this.position.headquarters };

    cloned.redPieces = { ...this.position.redPieces };
    cloned.bluePieces = { ...this.position.bluePieces };
    cloned.occupied = { ...this.position.occupied };
    cloned.carriers = { ...this.position.carriers };
    cloned.heroic = { ...this.position.heroic };

    // TODO: Clone stack manager, deploy session manager, air defense calculator

    return cloned;
  }

  turn(): Color {
    return this._turn;
  }

  isCheck(): boolean {
    return isCheck(this.position, this._turn);
  }

  isCheckmate(): boolean {
    return isCheckmate(this.position, this._turn);
  }

  isGameOver(): boolean {
    return (
      this.isCheckmate() || this.isDraw() || this._commanders.r === -1 || this._commanders.b === -1
    );
  }

  isDrawByFiftyMoves(): boolean {
    return this._halfMoves >= 100;
  }

  isThreefoldRepetition(): boolean {
    const fen = this.fen();
    return (this._positionCount.get(fen) || 0) >= 3;
  }

  isDraw(): boolean {
    return this.isDrawByFiftyMoves() || this.isThreefoldRepetition();
  }

  /**
   * Generates a 2D array representation of the current board state.
   * Each element contains piece information or null for empty squares.
   * @returns A 2D array representing the board, with each element containing piece data or null for empty squares
   */
  board(): ({ square: Square; type: PieceSymbol; color: Color; heroic: boolean } | null)[][] {
    const output: ({
      square: Square;
      type: PieceSymbol;
      color: Color;
      heroic: boolean;
    } | null)[][] = [];

    // Iterate through all 12 ranks (from rank 12 down to rank 1)
    for (let rank = 11; rank >= 0; rank--) {
      const row: ({ square: Square; type: PieceSymbol; color: Color; heroic: boolean } | null)[] =
        [];

      // Iterate through all 11 files (a-k)
      for (let file = 0; file < 11; file++) {
        const square = rank * 11 + file;
        const piece = this.position.getPieceAt(square);

        if (piece) {
          row.push({
            square: squareToAlgebraic(square),
            type: piece.type,
            color: piece.color,
            heroic: piece.heroic || false
          });
        } else {
          row.push(null);
        }
      }

      output.push(row);
    }

    return output;
  }

  /**
   * Retrieves the current square position of the commander (king) for the specified color.
   * @param color - The color of the commander to locate
   * @returns The square index in internal coordinates, or -1 if the commander has been captured
   */
  getCommanderSquare(color: Color): number {
    return this._commanders[color];
  }

  /**
   * Identifies all pieces of a specific color that can attack a given square.
   * @param square - The target square to check for attackers, in internal coordinate format
   * @param attackerColor - The color of pieces to check for attacking capability
   * @returns An array of objects containing the square and type of pieces that can attack the target square
   */
  getAttackers(_square: number, _attackerColor: Color): { square: number; type: PieceSymbol }[] {
    // TODO: Implement full attacker detection using bitboards
    // For now, return empty array
    return [];
  }

  // Deploy session methods
  getDeploySession(): DeploySession | null {
    return this._deploySession;
  }

  setDeploySession(session: DeploySession | null): void {
    this._deploySession = session;
  }

  /**
   * Commit the current deploy session.
   * @param switchTurn - Whether to switch turn after committing (default: true)
   * @returns Result object with success status and optional error message
   */
  commitDeploySession(switchTurn = true): { success: boolean; reason?: string } {
    if (!this._deploySession) {
      return {
        success: false,
        reason: 'No active deploy session to commit'
      };
    }

    if (!this.position.canCommitDeploySession()) {
      return {
        success: false,
        reason: 'Cannot commit incomplete deploy session'
      };
    }

    // Commit the session
    this.position.commitDeploySession();

    // Switch turn if requested
    if (switchTurn) {
      this._turn = this._turn === 'r' ? 'b' : 'r';

      if (this._turn === 'r') {
        this._moveNumber++;
      }
    }

    // Clear the session
    this._deploySession = null;

    // Update position counts
    this._updatePositionCounts();

    // Clear cache
    invalidateMoveCache();

    return { success: true };
  }

  /**
   * Cancel the active deploy session
   * Undoes all moves made during the session and clears the session.
   */
  cancelDeploySession(): void {
    if (!this._deploySession) {
      return; // Nothing to cancel
    }

    // Cancel the session in the position
    this.position.cancelDeploySession();

    // Clear the session
    this._deploySession = null;

    // Clear cache
    invalidateMoveCache();
  }

  /**
   * Reset the current deploy session (start over)
   * Undoes all moves and clears the session
   */
  resetDeploySession(): void {
    this.cancelDeploySession();
  }

  /**
   * Check if current deploy state can be committed
   * @returns Validation result with reason if commit would fail
   */
  canCommitDeploy(): { canCommit: boolean; reason?: string } {
    if (!this._deploySession) {
      return { canCommit: false, reason: 'No active deploy session' };
    }

    if (!this.position.canCommitDeploySession()) {
      return {
        canCommit: false,
        reason: 'Deploy session is incomplete (pieces remain without being moved or staying)'
      };
    }

    return { canCommit: true };
  }

  /**
   * Recombine a piece with a deployed piece during active deploy session
   * @param from - Source square (stack square)
   * @param to - Target square (deployed piece square)
   * @param piece - Piece type to recombine
   * @returns true if recombine succeeded
   */
  recombine(_from: Square, _to: Square, _piece: PieceSymbol): boolean {
    // TODO: Implement recombine logic
    throw new Error('Recombine not implemented yet');
  }

  /**
   * Get available recombine options
   * @param square - Stack square
   * @returns Array of recombine options
   */
  getRecombineOptions(_square: Square): any[] {
    // TODO: Implement recombine options
    return [];
  }

  /**
   * Undo the last recombine instruction
   */
  undoRecombineInstruction(): void {
    // TODO: Implement undo recombine
    throw new Error('Undo recombine not implemented yet');
  }

  /**
   * Deploy move (backward compatibility)
   * @param request - Deploy move request
   * @returns Deploy move result
   */
  deployMove(_request: any): any {
    // TODO: Implement deploy move
    throw new Error('Deploy move not implemented yet');
  }

  // Additional query methods
  /**
   * Retrieves the complete move history of the current game.
   * Can return moves either as algebraic notation strings or detailed Move objects.
   * @param options - Configuration options for history format
   * @param options.verbose - If true, returns Move objects; if false, returns SAN strings
   * @returns An array containing all moves made in the game, in chronological order
   */
  history(): string[];
  history(options: { verbose: true }): Move[];
  history(options: { verbose: false }): string[];
  history(options: { verbose: boolean }): string[] | Move[];
  history(_options?: { verbose?: boolean }): string[] | Move[] {
    // TODO: Implement proper history tracking with move reconstruction
    // For now, return empty array
    return [];
  }

  /**
   * Retrieves the heroic status of a piece at the specified square.
   * @param square - The square to examine, either in algebraic notation or internal coordinates
   * @param pieceType - Optional piece type to check specifically within a stack
   * @returns True if the piece (or specified piece type) has heroic status, false otherwise
   */
  getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean {
    const piece = this.get(square, pieceType);
    return piece?.heroic || false;
  }

  /**
   * Sets the heroic status of a piece at the specified square.
   * @param square - The square containing the piece
   * @param pieceType - Optional piece type to modify specifically within a stack
   * @param heroic - The heroic status to assign to the piece
   * @returns True if the heroic status was successfully updated, false if the piece was not found
   */
  setHeroicStatus(
    square: Square | number,
    pieceType: PieceSymbol | undefined,
    heroic: boolean
  ): boolean {
    const sq = typeof square === 'number' ? square : algebraicToSquare(square);
    if (sq === -1) return false;

    const piece = this.position.getPieceAt(sq);
    if (!piece) return false;

    // If no specific piece type requested or the piece matches the requested type
    if (!pieceType || piece.type === pieceType) {
      // Remove and re-place the piece with updated heroic status
      this.position.removePiece(sq);
      this.position.placePiece({ ...piece, heroic }, sq);
      return true;
    }

    // TODO: Handle heroic status for pieces in stacks
    return false;
  }

  /**
   * Retrieves the current air defense zones.
   * @returns The air defense zones
   */
  getAirDefense(): any {
    return this.position.getAirDefenseZones();
  }

  /**
   * Retrieves the current air defense influence.
   * @returns The air defense influence
   */
  getAirDefenseInfluence(): any {
    return this.position.getAirDefenseZones();
  }

  moveNumber(): number {
    return this._moveNumber;
  }

  getComment(): string | undefined {
    const fen = this.fen();
    return this._comments.get(fen);
  }

  setComment(comment: string): void {
    const fen = this.fen();
    this._comments.set(fen, comment);
  }

  removeComment(): string | undefined {
    const fen = this.fen();
    const comment = this._comments.get(fen);
    this._comments.delete(fen);
    return comment;
  }

  printBoard(): void {
    // TODO: Implement board printing
    console.log('Board printing not implemented yet');
  }

  updateCommandersPosition(sq: number, color: Color): void {
    if (this._commanders[color] === -1) return;
    this._commanders[color] = sq;
  }
}
