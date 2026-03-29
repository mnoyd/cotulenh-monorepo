export interface GameConfig {
  timeMinutes: number; // 1-60
  incrementSeconds: number; // 0-30
  isRated?: boolean;
  preferredColor?: 'random' | 'red' | 'blue';
}

export interface TimePreset {
  label: string;
  config: GameConfig;
}

export const TIME_PRESETS: TimePreset[] = [
  { label: '1+0', config: { timeMinutes: 1, incrementSeconds: 0 } },
  { label: '2+1', config: { timeMinutes: 2, incrementSeconds: 1 } },
  { label: '3+0', config: { timeMinutes: 3, incrementSeconds: 0 } },
  { label: '3+2', config: { timeMinutes: 3, incrementSeconds: 2 } },
  { label: '5+0', config: { timeMinutes: 5, incrementSeconds: 0 } },
  { label: '5+3', config: { timeMinutes: 5, incrementSeconds: 3 } },
  { label: '10+0', config: { timeMinutes: 10, incrementSeconds: 0 } },
  { label: '15+10', config: { timeMinutes: 15, incrementSeconds: 10 } },
  { label: '30+0', config: { timeMinutes: 30, incrementSeconds: 0 } }
];

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface InvitationItem {
  id: string;
  fromUser: { id: string; displayName: string; rating?: number };
  toUser: { id: string; displayName: string } | null;
  gameConfig: GameConfig;
  inviteCode: string | null;
  status: InvitationStatus;
  createdAt: string;
}
