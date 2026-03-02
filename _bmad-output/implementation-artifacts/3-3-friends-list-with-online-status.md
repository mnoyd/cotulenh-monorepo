# Story 3.3: Friends List with Online Status

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to see my friends list with who's currently online,
So that I can find someone available to play.

## Acceptance Criteria

### AC1: Friends List with Online Indicators

```gherkin
Given an authenticated user on the friends page
When the page loads
Then they see their complete friends list with display names and online/offline indicators (FR16)
And online friends are indicated with a green dot
And offline friends show no dot
```

### AC2: Real-Time Online Status Updates

```gherkin
Given a friend comes online (joins the lobby Presence channel)
When the Presence state updates
Then their indicator updates to "online" in real-time without page refresh
```

### AC3: Real-Time Offline Status Updates

```gherkin
Given a friend goes offline (leaves the lobby Presence channel)
When the Presence state updates
Then their indicator updates to "offline" in real-time without page refresh
```

### AC4: Remove Friend

```gherkin
Given a user wants to remove a friend
When they click "Remove" on a friend card
Then a confirmation dialog appears (Alert Dialog — destructive action)
And upon confirmation, the friendships row is deleted
And the friend disappears from both users' lists (FR17)
```

### AC5: Auto-Join Lobby on Login

```gherkin
Given an authenticated user logs in or loads the app
When the app initializes
Then they automatically join the lobby Presence channel
And they become visible as "online" to their friends
```

### AC6: Auto-Leave Lobby on Logout

```gherkin
Given an authenticated user logs out or closes the browser
When the session ends
Then they automatically leave the lobby Presence channel
And they appear as "offline" to their friends
```

### AC7: Friends Sorted by Online Status

```gherkin
Given a user views their friends list
When the list renders
Then online friends appear first, followed by offline friends
And within each group, friends are sorted alphabetically by display name
```

### AC8: Bilingual Support

```gherkin
Given a user views the friends page with online indicators
Then all labels and status text are displayed in the active language (EN/VI)
```

### AC9: Accessibility (WCAG 2.1 AA)

```gherkin
Given a user interacts with the friends list
Then online/offline status is announced by screen readers (not just color)
And the Remove button has an accessible label including the friend's name
And the confirmation dialog is keyboard-navigable and traps focus
And touch targets are minimum 44x44px on mobile
```

## Tasks / Subtasks

- [ ] Task 1: Lobby Presence channel setup (AC: 2, 3, 5, 6)
  - [ ] 1.1 Create `$lib/friends/presence.ts` — lobby channel management
  - [ ] 1.2 Implement `joinLobby(supabase, userId)` — subscribe to `lobby` Presence channel, track own presence
  - [ ] 1.3 Implement `leaveLobby()` — unsubscribe and clean up
  - [ ] 1.4 Implement `getOnlineUsers()` — returns Set of user IDs currently in lobby
  - [ ] 1.5 Implement `onPresenceChange(callback)` — notify when online users change (join/leave events)
  - [ ] 1.6 Handle auto-reconnect on channel disconnect (NFR18: exponential backoff)

- [ ] Task 2: Integrate lobby into app lifecycle (AC: 5, 6)
  - [ ] 2.1 In root `+layout.svelte`, join lobby when `isAuthenticated` becomes true
  - [ ] 2.2 Leave lobby when `isAuthenticated` becomes false (logout)
  - [ ] 2.3 Leave lobby on `beforeunload` / component destroy
  - [ ] 2.4 Ensure no memory leaks — clean up subscription on unmount

- [ ] Task 3: OnlineIndicator component (AC: 1, 9)
  - [ ] 3.1 Update `$lib/components/OnlineIndicator.svelte` (created hidden in Story 3.1) to be visible
  - [ ] 3.2 Green dot for online, no dot for offline
  - [ ] 3.3 Include `aria-label` for screen reader ("online" / "offline")
  - [ ] 3.4 Use `--color-player-online` design token for green dot

- [ ] Task 4: Update friends page with online status (AC: 1, 2, 3, 7)
  - [ ] 4.1 Subscribe to lobby Presence on friends page mount
  - [ ] 4.2 Cross-reference friends list with online users from Presence
  - [ ] 4.3 Sort friends: online first, then offline, alphabetical within each group
  - [ ] 4.4 Real-time updates: re-sort when Presence state changes
  - [ ] 4.5 Pass `isOnline` prop to PlayerCard / OnlineIndicator

- [ ] Task 5: Remove friend functionality (AC: 4)
  - [ ] 5.1 Add `removeFriend(friendshipId, userId)` to `$lib/friends/queries.ts`
  - [ ] 5.2 Add `removeFriend` action to `/user/friends/+page.server.ts`
  - [ ] 5.3 Add "Remove" button to friend card (outline style, red text)
  - [ ] 5.4 Confirmation via bits-ui Alert Dialog — neutral language, destructive button style
  - [ ] 5.5 Optimistic removal from list on confirm
  - [ ] 5.6 Toast: "Friend removed" on success

- [ ] Task 6: i18n translations (AC: 8)
  - [ ] 6.1 Add online status translation keys to `$lib/i18n/types.ts`
  - [ ] 6.2 Add English translations (online, offline, remove friend, confirmation dialog text)
  - [ ] 6.3 Add Vietnamese translations

- [ ] Task 7: Tests (AC: all)
  - [ ] 7.1 Presence tests: joinLobby creates subscription, leaveLobby cleans up, getOnlineUsers returns correct set
  - [ ] 7.2 Query tests: removeFriend deletes row, authorization check
  - [ ] 7.3 Server action tests: removeFriend action (success, not-your-friend error)
  - [ ] 7.4 Integration: friends list sorts online-first

## Dev Notes

### Critical Architecture Patterns (MUST FOLLOW)

**Tech Stack:** Same as Story 3.1

**Supabase Presence Channel — Lobby:**

```typescript
// Join lobby — subscribe to Presence channel
const channel = supabase.channel('lobby');
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    // state is Record<string, PresenceState[]>
    // Each key is the user's presence key
    onlineUsers = new Set(Object.keys(state));
  })
  .on('presence', { event: 'join' }, ({ key }) => {
    onlineUsers.add(key);
  })
  .on('presence', { event: 'leave' }, ({ key }) => {
    onlineUsers.delete(key);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId, online_at: new Date().toISOString() });
    }
  });
```

**Presence State Management:**

- Lobby subscription is global (root layout), not per-page
- Online users tracked via reactive `$state` Set
- Friends page reads the global online Set and cross-references with friends list
- No global store — use module-level `$state` in `$lib/friends/presence.ts`

**Alert Dialog for Destructive Actions:**

```svelte
<!-- bits-ui Alert Dialog for unfriend confirmation -->
<AlertDialog.Root>
  <AlertDialog.Trigger>Remove</AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Title>Remove Friend</AlertDialog.Title>
    <AlertDialog.Description>
      Are you sure you want to remove {friendName} from your friends list?
    </AlertDialog.Description>
    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
    <AlertDialog.Action onclick={handleRemove}>Remove</AlertDialog.Action>
  </AlertDialog.Content>
</AlertDialog.Root>
```

### Existing Code to Reuse (DO NOT REINVENT)

1. **Story 3.1 & 3.2 infrastructure**: friendships table, `$lib/friends/` module, friends page, PlayerCard, FriendRequestCard
2. **OnlineIndicator**: created (hidden) in Story 3.1 — activate it
3. **Root layout**: `+layout.svelte` — add lobby join/leave lifecycle here
4. **bits-ui Alert Dialog**: already installed — use for unfriend confirmation
5. **Auth state**: `isAuthenticated` derived in `+layout.svelte` — use to trigger lobby join/leave

### Dependencies

- **Story 3.1 and 3.2 must be completed first** — this story builds on the friends list UI and friendship queries

### Security Requirements

- Presence channel: authenticated users only (Supabase enforces via auth token)
- Remove friend: RLS ensures user can only delete friendships where they are user_a or user_b
- No user tracking beyond online/offline — no last-seen timestamps exposed

### Performance Considerations

- Lobby Presence channel must not cause memory leaks on mobile (NFR5: < 100MB)
- Auto-reconnect with exponential backoff on disconnect (NFR18)
- Presence sync events should not trigger excessive re-renders — batch updates

### Common Mistakes to Prevent

1. **DO NOT** create the Presence subscription per-page — it must be in root layout for app-wide online status
2. **DO NOT** forget to clean up the channel subscription on logout/unmount
3. **DO NOT** expose the lobby Presence channel to unauthenticated users
4. **DO NOT** use Svelte 4 stores — use Svelte 5 runes (`$state` Set for online users)
5. **DO NOT** forget `aria-label` on OnlineIndicator — color alone is not accessible
6. **DO NOT** skip the confirmation dialog for unfriending — it's a destructive action
7. **DO NOT** use stored procedures — all logic in TypeScript
8. **DO NOT** hardcode strings — all text through i18n

### Project Structure Notes

**New files to create:**

```
apps/cotulenh/app/src/lib/friends/
  presence.ts                      ← Lobby Presence channel management
```

**Files to modify:**

```
apps/cotulenh/app/src/routes/+layout.svelte          ← Add lobby join/leave lifecycle
apps/cotulenh/app/src/lib/components/OnlineIndicator.svelte  ← Activate (un-hide)
apps/cotulenh/app/src/lib/friends/queries.ts          ← Add removeFriend query
apps/cotulenh/app/src/routes/user/friends/+page.server.ts  ← Add removeFriend action
apps/cotulenh/app/src/routes/user/friends/+page.svelte     ← Add online indicators + remove + sorting
apps/cotulenh/app/src/lib/i18n/types.ts               ← Add online/remove keys
apps/cotulenh/app/src/lib/i18n/locales/en.ts          ← Add English translations
apps/cotulenh/app/src/lib/i18n/locales/vi.ts          ← Add Vietnamese translations
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3 - Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Realtime Channels, #Presence, #Component Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Online Indicator, #Destructive Actions, #Alert Dialog]
- [Source: _bmad-output/planning-artifacts/prd.md#FR16, #FR17, #NFR18]
