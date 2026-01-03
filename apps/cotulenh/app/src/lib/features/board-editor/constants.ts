import type { Piece } from '@cotulenh/board';

export const EMPTY_FEN = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1';

export const STARTING_FEN =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1';

export const DELETE_MARKER: Piece = { role: 'commander', color: 'red' };
