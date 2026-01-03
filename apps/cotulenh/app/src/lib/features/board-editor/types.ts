import type { Role, Color, Piece, Api } from '@cotulenh/board';

export type EditorMode = 'hand' | 'drop' | 'delete';

export interface SelectedPiece {
  role: Role;
  color: Color;
  promoted?: boolean;
}

export interface GhostPosition {
  x: number;
  y: number;
}

export interface BoardEditorState {
  boardApi: Api | null;
  fenInput: string;
  copyButtonText: string;
  boardOrientation: 'red' | 'blue';
  editorMode: EditorMode;
  selectedPiece: SelectedPiece | null;
  ghostPosition: GhostPosition;
  showGhost: boolean;
  isOverRelevantArea: boolean;
  heroicMode: boolean;
  validationError: string;
  currentTurn: 'red' | 'blue';
  initialFen: string;
  boardReady: boolean;
}

export { type Role, type Color, type Piece, type Api };
