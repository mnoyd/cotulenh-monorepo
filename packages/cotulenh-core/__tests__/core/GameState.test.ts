/**
 * Unit tests for GameState
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../src/core/GameState'
import { Board } from '../../src/core/Board'
import { pieceUtils } from '../../src/core/Piece'
import { RED, BLUE, INFANTRY, COMMANDER } from '../../src/types/Constants'

describe('GameState', () => {
  let board: Board
  let state: GameState

  beforeEach(() => {
    board = Board.createEmpty()
    board.set(0x00, pieceUtils.createPiece(RED, COMMANDER))
    board.set(0xba, pieceUtils.createPiece(BLUE, COMMANDER))

    state = new GameState({
      board,
      turn: RED,
      commanders: [0x00, 0xba],
      moveNumber: 1,
      halfMoves: 0,
    })
  })

  describe('constructor', () => {
    it('should create game state with all properties', () => {
      expect(state.board).toBe(board)
      expect(state.turn).toBe(RED)
      expect(state.commanders).toEqual([0x00, 0xba])
      expect(state.moveNumber).toBe(1)
      expect(state.halfMoves).toBe(0)
      expect(state.deploySession).toBeNull()
    })

    it('should default move number to 1', () => {
      const state = new GameState({
        board,
        turn: RED,
        commanders: [0x00, 0xba],
      })

      expect(state.moveNumber).toBe(1)
    })

    it('should default half moves to 0', () => {
      const state = new GameState({
        board,
        turn: RED,
        commanders: [0x00, 0xba],
      })

      expect(state.halfMoves).toBe(0)
    })
  })

  describe('getCommander', () => {
    it('should get red commander position', () => {
      expect(state.getCommander(RED)).toBe(0x00)
    })

    it('should get blue commander position', () => {
      expect(state.getCommander(BLUE)).toBe(0xba)
    })
  })

  describe('isTurn', () => {
    it('should return true for current turn', () => {
      expect(state.isTurn(RED)).toBe(true)
      expect(state.isTurn(BLUE)).toBe(false)
    })

    it('should work after turn switch', () => {
      const newState = state.withSwitchedTurn()

      expect(newState.isTurn(RED)).toBe(false)
      expect(newState.isTurn(BLUE)).toBe(true)
    })
  })

  describe('clone', () => {
    beforeEach(() => {
      board.set(0x10, pieceUtils.createPiece(RED, INFANTRY))
    })

    it('should create independent copy', () => {
      const cloned = state.clone()

      expect(cloned).not.toBe(state)
      expect(cloned.board).not.toBe(state.board)
    })

    it('should copy all properties', () => {
      const cloned = state.clone()

      expect(cloned.turn).toBe(state.turn)
      expect(cloned.commanders).toEqual(state.commanders)
      expect(cloned.commanders).not.toBe(state.commanders)
      expect(cloned.moveNumber).toBe(state.moveNumber)
      expect(cloned.halfMoves).toBe(state.halfMoves)
    })

    it('should not share board reference', () => {
      const cloned = state.clone()

      cloned.board.set(0x20, pieceUtils.createPiece(BLUE, INFANTRY))

      expect(state.board.get(0x20)).toBeNull()
    })
  })

  describe('withBoard', () => {
    it('should create new state with different board', () => {
      const newBoard = Board.createEmpty()
      newBoard.set(0x00, pieceUtils.createPiece(RED, COMMANDER))

      const newState = state.withBoard(newBoard)

      expect(newState).not.toBe(state)
      expect(newState.board).toBe(newBoard)
      expect(newState.turn).toBe(state.turn)
    })
  })

  describe('withSwitchedTurn', () => {
    it('should switch from red to blue', () => {
      const newState = state.withSwitchedTurn()

      expect(newState.turn).toBe(BLUE)
      expect(newState.moveNumber).toBe(1) // Still move 1
    })

    it('should switch from blue to red and increment move', () => {
      const blueState = state.withSwitchedTurn()
      const redState = blueState.withSwitchedTurn()

      expect(redState.turn).toBe(RED)
      expect(redState.moveNumber).toBe(2) // Incremented
    })

    it('should not mutate original state', () => {
      state.withSwitchedTurn()

      expect(state.turn).toBe(RED)
      expect(state.moveNumber).toBe(1)
    })
  })

  describe('withCommanders', () => {
    it('should update commander positions', () => {
      const newState = state.withCommanders(0x10, 0xa0)

      expect(newState.commanders).toEqual([0x10, 0xa0])
      expect(state.commanders).toEqual([0x00, 0xba])
    })
  })

  describe('withHalfMoves', () => {
    it('should update half move counter', () => {
      const newState = state.withHalfMoves(5)

      expect(newState.halfMoves).toBe(5)
      expect(state.halfMoves).toBe(0)
    })

    it('should reset half moves', () => {
      const state1 = state.withHalfMoves(10)
      const state2 = state1.withHalfMoves(0)

      expect(state2.halfMoves).toBe(0)
    })
  })

  describe('withDeploySession', () => {
    it('should set deploy session', () => {
      const mockSession = {
        originalSquare: 0x00,
        turn: RED,
        originalPiece: pieceUtils.createPiece(RED, INFANTRY),
        movedPieces: [],
        getEffectivePiece: () => null,
        getRemainingPieces: () => [],
        isComplete: () => false,
        clone: function () {
          return this
        },
      }

      const newState = state.withDeploySession(mockSession)

      expect(newState.deploySession).toBe(mockSession)
      expect(state.deploySession).toBeNull()
    })

    it('should clear deploy session', () => {
      const mockSession = {
        originalSquare: 0x00,
        turn: RED,
        originalPiece: pieceUtils.createPiece(RED, INFANTRY),
        movedPieces: [],
        getEffectivePiece: () => null,
        getRemainingPieces: () => [],
        isComplete: () => false,
        clone: function () {
          return this
        },
      }

      const state1 = state.withDeploySession(mockSession)
      const state2 = state1.withDeploySession(null)

      expect(state2.deploySession).toBeNull()
    })
  })

  describe('createInitial', () => {
    it('should create initial state', () => {
      const initial = GameState.createInitial()

      expect(initial.turn).toBe(RED)
      expect(initial.moveNumber).toBe(1)
      expect(initial.halfMoves).toBe(0)
      expect(initial.deploySession).toBeNull()
    })

    it('should have empty board', () => {
      const initial = GameState.createInitial()
      expect(initial.board.countPieces()).toBe(0)
    })
  })

  describe('createEmpty', () => {
    it('should create empty state', () => {
      const empty = GameState.createEmpty()

      expect(empty.turn).toBe(RED)
      expect(empty.moveNumber).toBe(1)
      expect(empty.halfMoves).toBe(0)
      expect(empty.board.countPieces()).toBe(0)
    })
  })

  describe('immutability', () => {
    it('should preserve commanders array on clone', () => {
      const cloned = state.clone()

      // Clone should have same values but different array reference
      expect(cloned.commanders).toEqual(state.commanders)
      expect(cloned.commanders).not.toBe(state.commanders)

      // Note: readonly in TypeScript is compile-time only
      // Runtime immutability would require Object.freeze()
    })

    it('should create new instances with with* methods', () => {
      const newBoard = state.withBoard(Board.createEmpty())
      const newTurn = state.withSwitchedTurn()
      const newCommanders = state.withCommanders(0x10, 0xa0)

      expect(newBoard).not.toBe(state)
      expect(newTurn).not.toBe(state)
      expect(newCommanders).not.toBe(state)
    })
  })
})
