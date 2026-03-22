import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';

import {
  DRAW_OFFER_EXPIRY_MS,
  TAKEBACK_REQUEST_EXPIRY_MS,
  getPendingActionExpiryEvent,
  getPendingActionExpiryMs,
  isPendingActionExpired
} from './pending-action.ts';

Deno.test('draw offers expire after 60 seconds', () => {
  const createdAtMs = Date.parse('2026-03-20T00:00:00.000Z');
  const pendingAction = {
    type: 'draw_offer' as const,
    color: 'red' as const,
    created_at: '2026-03-20T00:00:00.000Z'
  };

  assertEquals(getPendingActionExpiryMs(pendingAction.type), DRAW_OFFER_EXPIRY_MS);
  assertEquals(
    isPendingActionExpired(pendingAction, createdAtMs + DRAW_OFFER_EXPIRY_MS - 1),
    false
  );
  assertEquals(isPendingActionExpired(pendingAction, createdAtMs + DRAW_OFFER_EXPIRY_MS), true);
  assertEquals(getPendingActionExpiryEvent(pendingAction), 'draw_offer_expired');
});

Deno.test('takeback requests expire after 30 seconds', () => {
  const createdAtMs = Date.parse('2026-03-20T00:00:00.000Z');
  const pendingAction = {
    type: 'takeback_request' as const,
    color: 'blue' as const,
    move_count: 12,
    created_at: '2026-03-20T00:00:00.000Z'
  };

  assertEquals(getPendingActionExpiryMs(pendingAction.type), TAKEBACK_REQUEST_EXPIRY_MS);
  assertEquals(
    isPendingActionExpired(pendingAction, createdAtMs + TAKEBACK_REQUEST_EXPIRY_MS - 1),
    false
  );
  assertEquals(
    isPendingActionExpired(pendingAction, createdAtMs + TAKEBACK_REQUEST_EXPIRY_MS),
    true
  );
  assertEquals(getPendingActionExpiryEvent(pendingAction), 'takeback_expired');
});

Deno.test('invalid timestamps are treated as not expired', () => {
  const pendingAction = {
    type: 'draw_offer' as const,
    color: 'red' as const,
    created_at: 'not-a-date'
  };

  assertEquals(isPendingActionExpired(pendingAction), false);
});
