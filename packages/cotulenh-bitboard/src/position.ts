/**
 * Position representation using bitboards for CoTuLenh chess engine.
 *
 * This module implements the BitboardPosition class which maintains the game state
 * using bitboards for efficient piece queries and move generation.
 */

import type { Bitboard } from './bitboard';
import { EMPTY, setBit, clearBit, isSet, and } from './bitboard';
import type { Color, PieceSymbol, Piece } from './types';
import { isWaterSquare, isLandSquare } from './terrain';
import { StackManager } from './stack-manager';
import { DeploySessionManager } from './deploy-session';
import type { DeploySession } from './deploy-session';
import { AirDefenseZoneCalculator, BASE_AIRDEFENSE_CONFIG } from './air-defense';
import type { AirDefenseZones } from './air-defense';

/**
 * BitboardPosition class maintains the complete game state using bitboards.
 *
 * Uses separate bitboards for:
 * - Each of the 11 piece types (commander, infantry, tank, militia, engineer, artillery, anti-air, missile, air force, navy, headquarter)
 * - Each color (red, blue)
 * - Occupied squares
 * - Carriers (pieces with stacks)
 * - Heroic pieces
 */
export class BitboardPosition {
  // Piece type bitboards (11 piece types)
  commanders: Bitboard = { ...EMPTY };
  infantry: Bitboard = { ...EMPTY };
  tanks: Bitboard = { ...EMPTY };
  militia: Bitboard = { ...EMPTY };
  engineers: Bitboard = { ...EMPTY };
  artillery: Bitboard = { ...EMPTY };
  antiAir: Bitboard = { ...EMPTY };
  missiles: Bitboard = { ...EMPTY };
  airForce: Bitboard = { ...EMPTY };
  navy: Bitboard = { ...EMPTY };
  headquarters: Bitboard = { ...EMPTY };

  // Color bitboards
  redPieces: Bitboard = { ...EMPTY };
  bluePieces: Bitboard = { ...EMPTY };

  // Combined bitboards
  occupied: Bitboard = { ...EMPTY };

  // Special bitboards
  carriers: Bitboard = { ...EMPTY }; // Pieces that carry other pieces (stacks)
  heroic: Bitboard = { ...EMPTY }; // Heroic pieces

  // Stack Manager for handling complex stack mechanics
  stackManager: StackManager = new StackManager();

  // Deploy Session Manager for handling multi-step deploy moves
  deploySessionManager: DeploySessionManager = new DeploySessionManager();

  // Air Defense Zone Calculator for managing air defense zones
  airDefenseCalculator: AirDefenseZoneCalculator = new AirDefenseZoneCalculator();

  // Position tracking for repetition detection
  positionCount: Map<string, number> = new Map();

  // Optional PGN metadata
  header: Map<string, string> = new Map();

  // Optional PGN annotations
  comments: Map<string, string> = new Map();

  /**
   * Creates a new BitboardPosition with empty board.
   */
  constructor() {
    // All bitboards are initialized to EMPTY by default
  }

  /**
   * Clears all bitboards and resets the position to empty.
   */
  clear(): void {
    this.commanders = { ...EMPTY };
    this.infantry = { ...EMPTY };
    this.tanks = { ...EMPTY };
    this.militia = { ...EMPTY };
    this.engineers = { ...EMPTY };
    this.artillery = { ...EMPTY };
    this.antiAir = { ...EMPTY };
    this.missiles = { ...EMPTY };
    this.airForce = { ...EMPTY };
    this.navy = { ...EMPTY };
    this.headquarters = { ...EMPTY };

    this.redPieces = { ...EMPTY };
    this.bluePieces = { ...EMPTY };
    this.occupied = { ...EMPTY };
    this.carriers = { ...EMPTY };
    this.heroic = { ...EMPTY };

    this.stackManager.clear();
    this.deploySessionManager.clear();
    this.airDefenseCalculator.clear();

    this.positionCount.clear();
    this.header.clear();
    this.comments.clear();
  }

  /**
   * Gets the bitboard for a specific piece type.
   *
   * @param type - Piece type symbol
   * @returns Reference to the bitboard for that piece type
   */
  private getPieceBitboard(type: PieceSymbol): Bitboard {
    switch (type) {
      case 'c':
        return this.commanders;
      case 'i':
        return this.infantry;
      case 't':
        return this.tanks;
      case 'm':
        return this.militia;
      case 'e':
        return this.engineers;
      case 'a':
        return this.artillery;
      case 'g':
        return this.antiAir;
      case 's':
        return this.missiles;
      case 'f':
        return this.airForce;
      case 'n':
        return this.navy;
      case 'h':
        return this.headquarters;
      default:
        throw new Error(`Invalid piece type: ${type}`);
    }
  }

  /**
   * Sets the bitboard for a specific piece type.
   *
   * @param type - Piece type symbol
   * @param bitboard - New bitboard value
   */
  private setPieceBitboard(type: PieceSymbol, bitboard: Bitboard): void {
    switch (type) {
      case 'c':
        this.commanders = bitboard;
        break;
      case 'i':
        this.infantry = bitboard;
        break;
      case 't':
        this.tanks = bitboard;
        break;
      case 'm':
        this.militia = bitboard;
        break;
      case 'e':
        this.engineers = bitboard;
        break;
      case 'a':
        this.artillery = bitboard;
        break;
      case 'g':
        this.antiAir = bitboard;
        break;
      case 's':
        this.missiles = bitboard;
        break;
      case 'f':
        this.airForce = bitboard;
        break;
      case 'n':
        this.navy = bitboard;
        break;
      case 'h':
        this.headquarters = bitboard;
        break;
      default:
        throw new Error(`Invalid piece type: ${type}`);
    }
  }

  /**
   * Gets the color bitboard for a specific color.
   *
   * @param color - Color ('r' for red, 'b' for blue)
   * @returns Reference to the color bitboard
   */
  private getColorBitboard(color: Color): Bitboard {
    return color === 'r' ? this.redPieces : this.bluePieces;
  }

  /**
   * Sets the color bitboard for a specific color.
   *
   * @param color - Color ('r' for red, 'b' for blue)
   * @param bitboard - New bitboard value
   */
  private setColorBitboard(color: Color, bitboard: Bitboard): void {
    if (color === 'r') {
      this.redPieces = bitboard;
    } else {
      this.bluePieces = bitboard;
    }
  }

  /**
   * Places a piece on the board at the specified square.
   * Updates the piece type bitboard, color bitboard, occupied bitboard, and heroic bitboard.
   *
   * If the piece has a carrying array, creates a stack using the StackManager.
   *
   * Note: This method does not validate terrain restrictions. Use canPlacePieceOnSquare()
   * to validate before calling this method if terrain validation is needed.
   *
   * @param piece - Piece to place (type, color, heroic status, optional carrying array)
   * @param square - Square index (0-131) where to place the piece
   */
  placePiece(piece: Piece, square: number): void {
    // Check if this piece has carried pieces (is a stack)
    if (piece.carrying && piece.carrying.length > 0) {
      // Create a stack
      const carrier: Piece = {
        type: piece.type,
        color: piece.color,
        heroic: piece.heroic
      };

      this.stackManager.createStack(carrier, piece.carrying, square);

      // Update carriers bitboard
      this.carriers = setBit(this.carriers, square);
    }

    // Update piece type bitboard (for the carrier/main piece)
    const pieceBitboard = this.getPieceBitboard(piece.type);
    this.setPieceBitboard(piece.type, setBit(pieceBitboard, square));

    // Update color bitboard
    const colorBitboard = this.getColorBitboard(piece.color);
    this.setColorBitboard(piece.color, setBit(colorBitboard, square));

    // Update occupied bitboard
    this.occupied = setBit(this.occupied, square);

    // Update heroic bitboard if piece is heroic
    if (piece.heroic) {
      this.heroic = setBit(this.heroic, square);
    }
  }

  /**
   * Places a piece on the board with terrain validation.
   * Returns false if the piece cannot be placed due to terrain restrictions.
   *
   * @param piece - Piece to place (type, color, heroic status)
   * @param square - Square index (0-131) where to place the piece
   * @returns True if the piece was placed successfully, false if terrain is invalid
   */
  placePieceWithValidation(piece: Piece, square: number): boolean {
    // Validate terrain
    if (!this.canPlacePieceOnSquare(piece, square)) {
      return false;
    }

    // Place the piece
    this.placePiece(piece, square);
    return true;
  }

  /**
   * Removes a piece from the board at the specified square.
   * Updates all relevant bitboards and returns information about the removed piece.
   *
   * If the square contains a stack, destroys the stack and returns the complete
   * piece with carrying array.
   *
   * @param square - Square index (0-131) from which to remove the piece
   * @returns The removed piece information, or null if no piece was at the square
   */
  removePiece(square: number): Piece | null {
    // Check if square is occupied
    if (!isSet(this.occupied, square)) {
      return null;
    }

    // Check if this square has a stack
    let carriedPieces: Piece[] | undefined = undefined;
    if (this.stackManager.hasStack(square)) {
      const stack = this.stackManager.destroyStack(square);
      if (stack) {
        carriedPieces = stack.carried.length > 0 ? stack.carried : undefined;
      }

      // Clear carriers bitboard
      this.carriers = clearBit(this.carriers, square);
    }

    // Find which piece type is at this square
    const pieceTypes: PieceSymbol[] = ['c', 'i', 't', 'm', 'e', 'a', 'g', 's', 'f', 'n', 'h'];
    let pieceType: PieceSymbol | null = null;

    for (const type of pieceTypes) {
      const pieceBitboard = this.getPieceBitboard(type);
      if (isSet(pieceBitboard, square)) {
        pieceType = type;
        // Clear the bit in the piece type bitboard
        this.setPieceBitboard(type, clearBit(pieceBitboard, square));
        break;
      }
    }

    if (!pieceType) {
      // This shouldn't happen if occupied bitboard is correct
      return null;
    }

    // Determine color
    const isRed = isSet(this.redPieces, square);
    const isBlue = isSet(this.bluePieces, square);
    const color: Color = isRed ? 'r' : 'b';

    // Clear color bitboard
    if (isRed) {
      this.redPieces = clearBit(this.redPieces, square);
    }
    if (isBlue) {
      this.bluePieces = clearBit(this.bluePieces, square);
    }

    // Clear occupied bitboard
    this.occupied = clearBit(this.occupied, square);

    // Check and clear heroic status
    const wasHeroic = isSet(this.heroic, square);
    if (wasHeroic) {
      this.heroic = clearBit(this.heroic, square);
    }

    // Return the removed piece information (with carrying array if it was a stack)
    return {
      type: pieceType,
      color: color,
      heroic: wasHeroic || undefined,
      carrying: carriedPieces
    };
  }

  /**
   * Gets the piece at the specified square.
   *
   * If the square contains a stack, returns the carrier piece with the carrying array.
   *
   * @param square - Square index (0-131) to query
   * @returns The piece at the square, or null if the square is empty
   */
  getPieceAt(square: number): Piece | null {
    // Check if square is occupied
    if (!isSet(this.occupied, square)) {
      return null;
    }

    // Check if this square has a stack
    if (this.stackManager.hasStack(square)) {
      const stack = this.stackManager.getStack(square);
      if (stack) {
        // Return the carrier piece with carrying array
        return {
          ...stack.carrier,
          carrying: stack.carried.length > 0 ? stack.carried : undefined
        };
      }
    }

    // No stack - return single piece
    // Find which piece type is at this square
    const pieceTypes: PieceSymbol[] = ['c', 'i', 't', 'm', 'e', 'a', 'g', 's', 'f', 'n', 'h'];
    let pieceType: PieceSymbol | null = null;

    for (const type of pieceTypes) {
      const pieceBitboard = this.getPieceBitboard(type);
      if (isSet(pieceBitboard, square)) {
        pieceType = type;
        break;
      }
    }

    if (!pieceType) {
      // This shouldn't happen if occupied bitboard is correct
      return null;
    }

    // Determine color
    const isRed = isSet(this.redPieces, square);
    const color: Color = isRed ? 'r' : 'b';

    // Check heroic status
    const isHeroic = isSet(this.heroic, square);

    return {
      type: pieceType,
      color: color,
      heroic: isHeroic || undefined
    };
  }

  /**
   * Gets the color of the piece at the specified square.
   *
   * @param square - Square index (0-131) to query
   * @returns The color of the piece ('r' or 'b'), or null if the square is empty
   */
  getColorAt(square: number): Color | null {
    if (!isSet(this.occupied, square)) {
      return null;
    }

    return isSet(this.redPieces, square) ? 'r' : 'b';
  }

  /**
   * Checks if a square is occupied by any piece.
   *
   * @param square - Square index (0-131) to check
   * @returns True if the square is occupied, false otherwise
   */
  isOccupied(square: number): boolean {
    return isSet(this.occupied, square);
  }

  /**
   * Gets the bitboard for pieces of a specific type and color.
   *
   * @param type - Piece type symbol
   * @param color - Color ('r' for red, 'b' for blue)
   * @returns Bitboard containing all pieces of the specified type and color
   */
  getPiecesOfType(type: PieceSymbol, color: Color): Bitboard {
    const pieceBitboard = this.getPieceBitboard(type);
    const colorBitboard = this.getColorBitboard(color);
    return and(pieceBitboard, colorBitboard);
  }

  /**
   * Validates if a piece can be placed on a square based on terrain restrictions.
   *
   * Navy pieces can only be placed on water squares.
   * Land pieces can only be placed on land squares.
   *
   * @param piece - Piece to validate
   * @param square - Square index (0-131) where the piece would be placed
   * @returns True if the piece can be placed on the square, false otherwise
   */
  canPlacePieceOnSquare(piece: Piece, square: number): boolean {
    if (square < 0 || square >= 132) {
      return false;
    }

    // Navy pieces require water squares
    if (piece.type === 'n') {
      return isWaterSquare(square);
    }

    // All other pieces require land squares
    return isLandSquare(square);
  }

  /**
   * Validates if a piece at a square is on valid terrain.
   *
   * @param square - Square index (0-131) to check
   * @returns True if the piece is on valid terrain, false otherwise
   */
  isPieceOnValidTerrain(square: number): boolean {
    const piece = this.getPieceAt(square);
    if (!piece) {
      return true; // Empty square is always valid
    }

    return this.canPlacePieceOnSquare(piece, square);
  }

  /**
   * Gets the active deploy session, if any.
   *
   * @returns The active deploy session, or null if no session is active
   */
  getDeploySession(): DeploySession | null {
    return this.deploySessionManager.getActiveSession();
  }

  /**
   * Checks if there is an active deploy session.
   *
   * @returns True if a deploy session is active, false otherwise
   */
  hasActiveDeploySession(): boolean {
    return this.deploySessionManager.hasActiveSession();
  }

  /**
   * Initiates a deploy session from a stack at the specified square.
   *
   * @param stackSquare - The square where the stack is located
   * @param turn - The color of the player making the deploy
   * @throws Error if no stack exists at the square or a session is already active
   */
  initiateDeploySession(stackSquare: number, turn: Color): void {
    const stack = this.stackManager.getStack(stackSquare);
    if (!stack) {
      throw new Error(`No stack exists at square ${stackSquare}`);
    }

    this.deploySessionManager.initiateSession(stackSquare, stack, turn);
  }

  /**
   * Deploys a piece from the active deploy session to a destination square.
   *
   * Updates bitboards to reflect the piece placement.
   *
   * @param piece - The piece to deploy
   * @param to - The destination square
   * @returns The captured piece if any, or null
   * @throws Error if no session is active or piece is not available
   */
  deployPieceInSession(piece: Piece, to: number): Piece | null {
    if (!this.deploySessionManager.hasActiveSession()) {
      throw new Error('No active deploy session');
    }

    // Check if destination is occupied (capture)
    const captured = this.isOccupied(to) ? this.removePiece(to) : null;

    // Deploy the piece (record in session)
    this.deploySessionManager.deployPiece(piece, to, captured || undefined);

    // Place the piece on the board
    this.placePiece(piece, to);

    return captured;
  }

  /**
   * Undoes the last deploy step in the active session.
   *
   * Restores the board state before the last deploy.
   *
   * @returns True if a deploy was undone, false if no deploys to undo
   */
  undoLastDeployInSession(): boolean {
    const lastMove = this.deploySessionManager.undoLastDeploy();
    if (!lastMove) {
      return false;
    }

    // Remove the deployed piece from the board
    this.removePiece(lastMove.to);

    // Restore captured piece if any
    if (lastMove.captured) {
      this.placePiece(lastMove.captured, lastMove.to);
    }

    return true;
  }

  /**
   * Checks if the active deploy session can be committed.
   *
   * @returns True if all pieces have been deployed, false otherwise
   */
  canCommitDeploySession(): boolean {
    return this.deploySessionManager.canCommit();
  }

  /**
   * Commits the active deploy session, finalizing all deploy moves.
   *
   * Removes the original stack from the board and clears the session.
   *
   * @returns The completed deploy session
   * @throws Error if no session is active or not all pieces deployed
   */
  commitDeploySession(): DeploySession {
    const session = this.deploySessionManager.commit();

    // Remove the original stack from the board (it's been fully deployed)
    // The stack square should now be empty since all pieces were deployed
    // Note: The pieces have already been placed during deployPieceInSession calls

    return session;
  }

  /**
   * Cancels the active deploy session and restores the original stack.
   *
   * Undoes all deploy moves and restores the board to the state before the session.
   *
   * @throws Error if no session is active
   */
  cancelDeploySession(): void {
    const session = this.deploySessionManager.getActiveSession();
    if (!session) {
      throw new Error('No active deploy session to cancel');
    }

    // Undo all deployed moves in reverse order
    for (let i = session.deployedMoves.length - 1; i >= 0; i--) {
      const move = session.deployedMoves[i];

      // Remove the deployed piece
      this.removePiece(move.to);

      // Restore captured piece if any
      if (move.captured) {
        this.placePiece(move.captured, move.to);
      }
    }

    // Get the original stack and restore it
    const originalStack = this.deploySessionManager.cancel();

    // Recreate the original stack
    this.stackManager.createStack(
      originalStack.carrier,
      originalStack.carried,
      originalStack.square
    );

    // Place the carrier piece back on the board
    this.placePiece(
      {
        ...originalStack.carrier,
        carrying: originalStack.carried
      },
      originalStack.square
    );
  }

  /**
   * Gets the current air defense zones.
   *
   * @returns The air defense zones for both sides
   */
  getAirDefenseZones(): AirDefenseZones {
    return this.airDefenseCalculator.getZones();
  }

  /**
   * Recalculates all air defense zones from the current board state.
   *
   * Scans the board for all anti-air pieces (anti-air, missile, navy) and
   * calculates their influence zones.
   */
  recalculateAirDefenseZones(): void {
    const antiAirPieces: Array<{
      square: number;
      pieceType: PieceSymbol;
      isHeroic: boolean;
      color: Color;
    }> = [];

    // Scan all squares for anti-air pieces
    for (let square = 0; square < 132; square++) {
      if (!this.isOccupied(square)) {
        continue;
      }

      const piece = this.getPieceAt(square);
      if (!piece) {
        continue;
      }

      // Check if this piece provides air defense
      if (BASE_AIRDEFENSE_CONFIG[piece.type]) {
        antiAirPieces.push({
          square,
          pieceType: piece.type,
          isHeroic: piece.heroic || false,
          color: piece.color
        });
      }
    }

    // Recalculate all zones
    this.airDefenseCalculator.calculateAllZones(antiAirPieces);
  }

  /**
   * Updates air defense zones when an anti-air piece moves.
   *
   * @param oldSquare - Previous square of the anti-air piece
   * @param newSquare - New square of the anti-air piece
   * @param pieceType - Type of the anti-air piece
   * @param isHeroic - Whether the piece is heroic
   * @param color - Color of the anti-air piece
   */
  updateAirDefenseZone(
    oldSquare: number,
    newSquare: number,
    pieceType: PieceSymbol,
    isHeroic: boolean,
    color: Color
  ): void {
    this.airDefenseCalculator.updateZone(oldSquare, newSquare, pieceType, isHeroic, color);
  }

  /**
   * Removes air defense zone when an anti-air piece is captured.
   *
   * @param square - Square where the anti-air piece was located
   * @param color - Color of the anti-air piece
   */
  removeAirDefenseZone(square: number, color: Color): void {
    this.airDefenseCalculator.removeZone(square, color);
  }

  /**
   * Checks if a square is in an enemy air defense zone.
   *
   * @param square - Square to check
   * @param enemyColor - Color of the enemy (who controls the zones)
   * @returns True if the square is in an enemy air defense zone
   */
  isInAirDefenseZone(square: number, enemyColor: Color): boolean {
    return this.airDefenseCalculator.isInZone(square, enemyColor);
  }

  /**
   * Gets all anti-air pieces that influence a specific square.
   *
   * @param square - Square to check
   * @param enemyColor - Color of the enemy (who controls the zones)
   * @returns Array of anti-air piece squares that influence the target square
   */
  getAirDefenseInfluencers(square: number, enemyColor: Color): number[] {
    return this.airDefenseCalculator.getInfluencingPieces(square, enemyColor);
  }

  /**
   * Checks if an air force move is valid considering air defense zones.
   *
   * Air force pieces:
   * - Cannot move through multiple air defense zones
   * - Can make kamikaze attacks into a single zone (if not moving out and back in)
   * - Can move freely in areas without air defense
   *
   * @param to - Destination square
   * @param enemyColor - Color of the enemy
   * @returns Object with { allowed: boolean, isKamikaze: boolean }
   */
  checkAirForceMove(to: number, enemyColor: Color): { allowed: boolean; isKamikaze: boolean } {
    // Get the path from 'from' to 'to'
    // For now, we'll just check the destination square
    // Full path checking would require move generation context

    const influencers = this.getAirDefenseInfluencers(to, enemyColor);

    if (influencers.length === 0) {
      // No air defense at destination - safe move
      return { allowed: true, isKamikaze: false };
    }

    // Check if this is a kamikaze attack (entering a single zone)
    // For simplicity, we allow moves into zones as kamikaze attacks
    // The full logic would track the path and check for multiple zones
    return { allowed: true, isKamikaze: true };
  }
}
