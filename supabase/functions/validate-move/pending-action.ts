export type PendingAction =
  | { type: 'draw_offer'; color: 'red' | 'blue'; created_at: string }
  | { type: 'takeback_request'; color: 'red' | 'blue'; move_count: number; created_at: string }
  | null;

export const DRAW_OFFER_EXPIRY_MS = 60_000;
export const TAKEBACK_REQUEST_EXPIRY_MS = 30_000;

export function getPendingActionExpiryMs(type: NonNullable<PendingAction>['type']): number {
  return type === 'draw_offer' ? DRAW_OFFER_EXPIRY_MS : TAKEBACK_REQUEST_EXPIRY_MS;
}

export function getPendingActionExpiryEvent(
  pendingAction: NonNullable<PendingAction>
): 'draw_offer_expired' | 'takeback_expired' {
  return pendingAction.type === 'draw_offer' ? 'draw_offer_expired' : 'takeback_expired';
}

export function isPendingActionExpired(
  pendingAction: NonNullable<PendingAction>,
  nowMs = Date.now()
): boolean {
  const createdAtMs = Date.parse(pendingAction.created_at);
  if (!Number.isFinite(createdAtMs)) {
    return false;
  }

  return nowMs - createdAtMs >= getPendingActionExpiryMs(pendingAction.type);
}
