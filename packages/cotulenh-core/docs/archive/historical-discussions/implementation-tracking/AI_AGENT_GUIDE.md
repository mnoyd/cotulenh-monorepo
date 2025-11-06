# AI Agent Quick Start Guide

**For AI Assistants:** This document tells you exactly what to do and how to
verify your work.

---

## 🤖 Instructions for AI Agents

### 1. Read Current Status

```bash
# First, check where we are
cat docs/implementation-tracking/STATUS.md
```

Look for **"Current Work"** section to see what task to work on.

### 2. Read Task Details

```bash
# Open the current phase document
cat docs/implementation-tracking/phase-1-foundation.md
# or phase-2-integration.md
# or phase-3-polish.md
```

Find the current task and read:

- **Steps:** Exact steps to follow
- **Acceptance Criteria:** What "done" looks like
- **Verification:** Commands to prove it works

### 3. Do The Work

Follow the steps **exactly as written**. Do not:

- Skip steps
- Assume things work
- Move ahead without verification

### 4. Verify Your Work

Run **every verification command** listed in the task.

Example:

```bash
# Task says to run these:
npx tsc --noEmit
npm test -- bitboard-utils

# Run them both!
```

### 5. Update Status

After verification passes:

```bash
# Edit STATUS.md
# Check the box for completed task
# Update progress percentage
# Add entry to Daily Log
```

### 6. Commit

```bash
git add .
git commit -m "feat(bitboard): complete task X.Y - [description]"
```

### 7. Move to Next Task

Check STATUS.md for next task, repeat from step 2.

---

## 🚫 IMPORTANT RULES

### DO NOT:

❌ Skip tasks or work out of order  
❌ Mark task complete without running verification  
❌ Assume tests pass without running them  
❌ Move to next phase without passing checkpoint  
❌ Modify files not mentioned in the task  
❌ Add features not in the spec

### DO:

✅ Follow tasks in exact order  
✅ Run all verification commands  
✅ Update STATUS.md after each task  
✅ Ask for help if verification fails  
✅ Document issues in STATUS.md  
✅ Commit after each task

---

## 🎯 Current State Detection

Run this to detect current state:

```bash
# Check what exists
echo "=== Files Check ==="
ls src/bitboard/ 2>/dev/null || echo "No bitboard directory yet"
ls test/bitboard/ 2>/dev/null || echo "No bitboard tests yet"

echo ""
echo "=== Status Check ==="
grep "Current Phase:" docs/implementation-tracking/STATUS.md
grep "Current Work:" docs/implementation-tracking/STATUS.md

echo ""
echo "=== Next Action ==="
# Read STATUS.md to see next task
```

---

## 📝 Task Completion Template

When you complete a task, update STATUS.md like this:

```markdown
### [2025-10-15] - Session 1

**Tasks Completed:**

- Task 1.1 - Bitboard Utils Implementation ✅

**Issues Encountered:**

- None

**Tests Status:**

- Passing: 6 tests
- Failing: 0 tests
- New: 6 tests

**Next Session:**

- Task 1.2 - Bitboard Utils Tests
```

---

## 🔍 Verification Checklist

Before marking any task complete, verify:

- [ ] All steps in task completed
- [ ] All verification commands run successfully
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Tests pass: `npm test -- [test-name]`
- [ ] Files exist where expected
- [ ] STATUS.md updated
- [ ] Changes committed

---

## 🚨 When Verification Fails

If verification fails:

1. **Read the error message carefully**
2. **Check which step failed**
3. **Re-read task steps**
4. **Fix the issue**
5. **Re-run verification**
6. **Document the issue in STATUS.md**

Do not mark task complete until verification passes!

---

## 📊 Progress Tracking

After each task, calculate progress:

```
Tasks Complete / Total Tasks = Progress %

Example:
1 / 14 = 7%
3 / 14 = 21%
14 / 14 = 100% 🎉
```

Update in STATUS.md:

```markdown
**Overall Progress:** 21% (3/14 tasks complete)
```

---

## 🎯 Checkpoints

Checkpoints are **mandatory stopping points**.

### Checkpoint 1: After Task 1.6

```bash
# Run all Phase 1 verification
npm test -- bitboard
npx tsc --noEmit

# All must pass before Phase 2
```

### Checkpoint 2: After Task 2.5

```bash
# Run all tests
npm test

# All must pass before Phase 3
```

### Checkpoint 3: After Task 3.3

```bash
# Final validation
npm test
npm run lint
npm run build

# All must pass before completion
```

**Do not proceed past a checkpoint if verification fails!**

---

## 🧩 Example Session

Here's a complete example of working through Task 1.1:

```bash
# 1. Check status
cat docs/implementation-tracking/STATUS.md
# Shows: Current Task: 1.1 - Bitboard Utils Implementation

# 2. Read task
cat docs/implementation-tracking/phase-1-foundation.md
# Read Task 1.1 section

# 3. Do the work
mkdir -p src/bitboard
touch src/bitboard/bitboard-utils.ts
# (Write the code as specified)

# 4. Verify
npx tsc --noEmit
# Must show no errors

ls -la src/bitboard/bitboard-utils.ts
# Must show file exists

# 5. Update STATUS.md
# (Edit file, check box, update progress)

# 6. Commit
git add .
git commit -m "feat(bitboard): add bitboard utils foundation"

# 7. Next task
# Move to Task 1.2
```

---

## 💬 Communication Template

When reporting progress to user:

```markdown
## Task [X.Y] Complete ✅

**What was done:**

- [List what you implemented]

**Files created/modified:**

- src/bitboard/[file].ts
- test/bitboard/[file].test.ts

**Verification results:**

- ✅ TypeScript: No errors
- ✅ Tests: X tests passing
- ✅ Files exist as expected

**Next task:**

- Task [X.Y+1] - [Name]
```

---

## 🎓 Success Criteria

You're doing it right if:

- ✅ Every task has verification that passes
- ✅ STATUS.md is always up to date
- ✅ No tasks skipped
- ✅ No checkpoints bypassed
- ✅ All commits have clear messages
- ✅ Progress is measurable

You're doing it wrong if:

- ❌ Moving ahead without verification
- ❌ Skipping tasks
- ❌ Not updating STATUS.md
- ❌ Bypassing checkpoints
- ❌ Assuming things work

---

## 🚀 Ready to Start?

1. Read `STATUS.md` to see current state
2. Open the current phase document
3. Find the current task
4. Follow the steps exactly
5. Verify your work
6. Update status
7. Commit
8. Move to next task

**Start here:** `docs/implementation-tracking/STATUS.md`

---

**Remember:** Verification is not optional. If verification fails, the task is
not complete!
