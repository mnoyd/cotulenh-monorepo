export interface GameConfig {
  timeMinutes: number; // 1-60
  incrementSeconds: number; // 0-30
}

export interface TimePreset {
  label: string;
  config: GameConfig;
}

export const TIME_PRESETS: TimePreset[] = [
  { label: '5+0', config: { timeMinutes: 5, incrementSeconds: 0 } },
  { label: '10+0', config: { timeMinutes: 10, incrementSeconds: 0 } },
  { label: '15+10', config: { timeMinutes: 15, incrementSeconds: 10 } }
];

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface InvitationItem {
  id: string;
  fromUser: { id: string; displayName: string };
  toUser: { id: string; displayName: string } | null;
  gameConfig: GameConfig;
  inviteCode: string;
  status: InvitationStatus;
  createdAt: string;
}
