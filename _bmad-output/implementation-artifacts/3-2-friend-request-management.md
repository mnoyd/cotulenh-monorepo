# Story 3.2: Friend Request Management

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to view my incoming friend requests and accept or decline them,
So that I can control who is on my friends list.

## Acceptance Criteria

### AC1: View Pending Incoming Requests

```gherkin
Given an authenticated user on the friends page
When the page loads
Then they see a section showing pending incoming friend requests
And each request shows the sender's display name with Accept and Decline buttons (FR14)
```

### AC2: Accept Friend Request

```gherkin
Given a user clicks "Accept" on an incoming request
When the action completes
Then the friendships row is updated to status = 'accepted'
And the request disappears from pending and the sender appears in the friends list (FR15)
And a toast confirms "Friend request accepted" (auto-dismiss 4s)
```

### AC3: Decline Friend Request

```gherkin
Given a user clicks "Decline" on an incoming request
When the action completes
Then the friendships row is deleted
And the request disappears from the pending section (FR15)
```

### AC4: Empty Pending Requests

```gherkin
Given a user has no pending incoming requests
When the page loads
Then the pending requests section shows "No pending invitations"
```

### AC5: View Sent Requests

```gherkin
Given a user has sent friend requests that are still pending
When the page loads
Then they see a "Sent Requests" section showing pending outgoing requests with a "Cancel" option
```

### AC6: Cancel Sent Request

```gherkin
Given a user clicks "Cancel" on a sent request
When the action completes
Then the friendships row is deleted and the request disappears
```

### AC7: Bilingual Support

```gherkin
Given a user views the friends page request sections
Then all labels, buttons, and messages are displayed in the active language (EN/VI)
```

### AC8: Accessibility (WCAG 2.1 AA)

```gherkin
Given a user interacts with friend request actions
Then Accept/Decline/Cancel buttons have accessible labels
And focus indicators are visible (2px outline)
And touch targets are minimum 44x44px on mobile
And screen readers announce action outcomes via toast aria-live
```

## Tasks / Subtasks

- [ ] Task 1: Extend friends queries (AC: 1, 2, 3, 5, 6)
  - [ ] 1.1 Add `getPendingIncomingRequests(userId)` to `$lib/friends/queries.ts` — query friendships where status = 'pending' and initiated_by != userId, join profiles for sender display name
  - [ ] 1.2 Add `getPendingSentRequests(userId)` to `$lib/friends/queries.ts` — query friendships where status = 'pending' and initiated_by = userId, join profiles for recipient display name
  - [ ] 1.3 Add `acceptFriendRequest(friendshipId, userId)` — update status to 'accepted', verify user is the recipient (not the initiator)
  - [ ] 1.4 Add `declineFriendRequest(friendshipId, userId)` — delete the row, verify user is the recipient
  - [ ] 1.5 Add `cancelSentRequest(friendshipId, userId)` — delete the row, verify user is the initiator

- [ ] Task 2: Server actions (AC: 2, 3, 6)
  - [ ] 2.1 Add `acceptRequest` action to `/user/friends/+page.server.ts`
  - [ ] 2.2 Add `declineRequest` action to `/user/friends/+page.server.ts`
  - [ ] 2.3 Add `cancelRequest` action to `/user/friends/+page.server.ts`
  - [ ] 2.4 Update load function to return pending incoming + sent requests alongside friends list

- [ ] Task 3: FriendRequestCard component (AC: 1, 8)
  - [ ] 3.1 Create `$lib/components/FriendRequestCard.svelte`
  - [ ] 3.2 Props: senderName, friendshipId, direction ('incoming' | 'sent')
  - [ ] 3.3 Incoming variant: display name + Accept/Decline buttons
  - [ ] 3.4 Sent variant: display name + Cancel button
  - [ ] 3.5 Minimum 44x44px touch targets, accessible button labels

- [ ] Task 4: Update friends page UI (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [ ] 4.1 Add "Pending Requests" section above friends list (incoming requests)
  - [ ] 4.2 Add "Sent Requests" section (outgoing pending requests)
  - [ ] 4.3 Optimistic updates: request disappears immediately on accept/decline/cancel
  - [ ] 4.4 On accept: move user from pending to friends list
  - [ ] 4.5 Empty state: "No pending invitations" when no incoming requests
  - [ ] 4.6 Toast notifications for accept/decline/cancel outcomes

- [ ] Task 5: i18n translations (AC: 7)
  - [ ] 5.1 Add friend request translation keys to `$lib/i18n/types.ts`
  - [ ] 5.2 Add English translations (accept, decline, cancel, pending, empty states)
  - [ ] 5.3 Add Vietnamese translations

- [ ] Task 6: Tests (AC: all)
  - [ ] 6.1 Query tests: getPendingIncomingRequests, getPendingSentRequests, acceptFriendRequest, declineFriendRequest, cancelSentRequest
  - [ ] 6.2 Server action tests: acceptRequest (success, not-recipient error), declineRequest, cancelRequest
  - [ ] 6.3 Authorization tests: verify user can only accept/decline their own incoming requests, only cancel their own sent requests

## Dev Notes

### Critical Architecture Patterns (MUST FOLLOW)

**Tech Stack:** Same as Story 3.1

**Supabase Client Access:** Same as Story 3.1

**Friendships Table — Query Patterns:**

```typescript
// Incoming requests: I am user_a or user_b, but NOT the initiator
const { data: incoming } = await supabase
  .from('friendships')
  .select('id, user_a, user_b, initiated_by, created_at, profiles!user_a(display_name), profiles!user_b(display_name)')
  .eq('status', 'pending')
  .or(`user_a.eq.${userId},user_b.eq.${userId}`)
  .neq('initiated_by', userId);

// Accept: update status, verify caller is recipient
const { error } = await supabase
  .from('friendships')
  .update({ status: 'accepted', updated_at: new Date().toISOString() })
  .eq('id', friendshipId)
  .or(`user_a.eq.${userId},user_b.eq.${userId}`)
  .neq('initiated_by', userId);
```

**Authorization Pattern:**

Accept/decline must verify the current user is the **recipient** (not the initiator). Cancel must verify the current user is the **initiator**. RLS ensures row access, but business logic must check the `initiated_by` field.

### Existing Code to Reuse (DO NOT REINVENT)

1. **Story 3.1 infrastructure**: friendships table, `$lib/friends/` module, friends page route, PlayerCard component
2. **Auth guard**: `/user/+layout.server.ts` already protects `/user/friends`
3. **Toast**: svelte-sonner — follow existing patterns
4. **Form actions**: SvelteKit form actions with `use:enhance` for progressive enhancement

### Dependencies

- **Story 3.1 must be completed first** — this story builds on the friendships table, friends page, and queries module created in 3.1

### Security Requirements

- RLS: users can only see/modify friendships where they are user_a or user_b
- Accept/decline authorization: server must verify `initiated_by != currentUser` (recipient only)
- Cancel authorization: server must verify `initiated_by == currentUser` (sender only)
- Sanitize display names in FriendRequestCard rendering

### Common Mistakes to Prevent

1. **DO NOT** allow the request initiator to accept their own request
2. **DO NOT** allow the recipient to cancel (only decline) — cancel is for the sender
3. **DO NOT** forget canonical ordering when querying friendships
4. **DO NOT** use Svelte 4 stores — use Svelte 5 runes only
5. **DO NOT** skip optimistic updates — request should disappear immediately
6. **DO NOT** hardcode strings — all text through i18n

### Project Structure Notes

**New files to create:**

```
apps/cotulenh/app/src/lib/components/
  FriendRequestCard.svelte         ← Request card with accept/decline/cancel

(Tests added to existing files from Story 3.1)
```

**Files to modify:**

```
apps/cotulenh/app/src/lib/friends/queries.ts    ← Add request management queries
apps/cotulenh/app/src/routes/user/friends/+page.server.ts  ← Add actions + load data
apps/cotulenh/app/src/routes/user/friends/+page.svelte     ← Add request sections
apps/cotulenh/app/src/lib/i18n/types.ts         ← Add request keys
apps/cotulenh/app/src/lib/i18n/locales/en.ts    ← Add English translations
apps/cotulenh/app/src/lib/i18n/locales/vi.ts    ← Add Vietnamese translations
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3 - Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema, #RLS Policies]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty States, #Friend Request Flow]
- [Source: _bmad-output/planning-artifacts/prd.md#FR14, #FR15]
