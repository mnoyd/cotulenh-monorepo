# Legacy Cleanup Execution Plan

**Date:** 2025-10-15  
**Purpose:** Remove all legacy code and obsolete documentation  
**Impact:** Breaking change - complete rebuild from scratch

---

## 🗑️ Files to Remove

### 1. Legacy Implementation (`src/legacy/`)

```
src/legacy/
├── README.md (1457 bytes)
├── cotulenh.ts (47KB) - Monolithic implementation
├── air-defense.ts (4.9KB) - Old air defense loops
├── move-apply.ts (19.8KB) - Old move application
├── move-generation.ts (19.5KB) - Old move generation
└── deploy-move.ts (9.2KB) - Old deploy logic

Total: ~100KB legacy code
```

**Reason:** Complete rewrite with new architecture. Legacy code creates
confusion and maintenance burden.

---

### 2. Legacy Tests (`__tests__/legacy/`)

```
__tests__/legacy/
├── air-defense.test.ts - Tests old implementation
├── atomic-move.test.ts - Tests old command pattern
├── move-generation.test.ts - Tests old generators
├── cotulenh.test.ts - Tests old API
└── cotulenh.benchmark.ts - Old benchmarks

Total: 5 test files for obsolete code
```

**Reason:** Tests legacy implementation, not game rules. Behavioral tests in
`__tests__/behavior/` cover game rules.

---

### 3. Stub Files (Re-exports to Legacy)

```
src/cotulenh.ts (262 bytes) - Stub pointing to legacy
src/deploy-move.ts (178 bytes) - Stub pointing to legacy
```

**Reason:** These just re-export legacy code. New implementation will replace
them.

---

### 4. Obsolete Documentation

```
docs/implementation-tracking/ (7 files)
├── AI_AGENT_GUIDE.md - Wrong incremental approach
├── COMPLETION_CHECKLIST.md - Wrong integration plan
├── README.md - Misunderstood requirements
├── STATUS.md - Obsolete status tracking
├── phase-1-foundation.md - Wrong foundation (incremental)
├── phase-2-integration.md - Wrong (thought we keep legacy)
└── phase-3-polish.md - Based on wrong assumptions

docs/MIGRATION_STATUS.md - Obsolete migration tracking
```

**Reason:** These documents describe an incremental integration approach,
keeping legacy code. We're doing a complete rebuild instead.

---

## ✅ Files to Keep

### Core Implementation (New)

```
src/bitboard/ (3 files) ✅
├── bitboard-utils.ts - Basic bitboard operations
├── circle-masks.ts - Precomputed circles
└── air-defense-bitboard.ts - Air defense calculator

src/type.ts ✅ - Type definitions
src/utils.ts ✅ - Utility functions
```

### Tests (Valid)

```
__tests__/behavior/ (10 files) ✅
├── move.test.ts - Game rule tests
├── basic-move.test.ts
├── combined-stack.test.ts
├── heroic.test.ts
├── king-attacked.test.ts
├── san.test.ts
├── get-attackers.test.ts
├── generate-stack-move.test.ts
├── stress.test.ts
└── utils.test.ts

__tests__/bitboard/ (3 files) ✅
├── bitboard-utils.test.ts - 31 passing tests
├── circle-masks.test.ts
└── air-defense-bitboard.test.ts

__tests__/test-helpers.ts ✅
__tests__/README.md ✅
```

**Reason:** These test game rules and new bitboard implementation, not legacy
code.

### Documentation (Valid)

```
docs/context/ (40+ files) ✅
- Complete game rules documentation
- Language-agnostic
- Source of truth

docs/legacy-square-by-square-approaches/ (18 files) ✅
- Architecture patterns we're following
- Design decisions
- Square-by-square approach guidance

docs/README.md ✅ - Documentation index
docs/COMPLETE_REBUILD_PLAN.md ✅ - New plan
```

---

## 🚀 Cleanup Commands

### Preview (Dry Run)

```bash
# See what would be deleted
echo "=== Legacy Implementation ==="
ls -lh src/legacy/

echo -e "\n=== Legacy Tests ==="
ls -lh __tests__/legacy/

echo -e "\n=== Stub Files ==="
ls -lh src/cotulenh.ts src/deploy-move.ts

echo -e "\n=== Obsolete Docs ==="
ls -lh docs/implementation-tracking/
ls -lh docs/MIGRATION_STATUS.md
```

### Execute Cleanup

```bash
#!/bin/bash
set -e

echo "🗑️  Removing legacy implementation..."
rm -rf src/legacy/

echo "🗑️  Removing legacy tests..."
rm -rf __tests__/legacy/

echo "🗑️  Removing stub files..."
rm -f src/cotulenh.ts
rm -f src/deploy-move.ts

echo "🗑️  Removing obsolete documentation..."
rm -rf docs/implementation-tracking/
rm -f docs/MIGRATION_STATUS.md

echo "✅ Cleanup complete!"
echo ""
echo "Remaining structure:"
echo "src/"
ls -1 src/
echo ""
echo "__tests__/"
ls -1 __tests__/
echo ""
echo "docs/"
ls -1 docs/
```

---

## 📊 Impact Analysis

### Before Cleanup

```
src/
├── legacy/ (100KB+) 🔴
├── cotulenh.ts (stub) 🔴
├── deploy-move.ts (stub) 🔴
├── bitboard/ ✅
├── type.ts ✅
└── utils.ts ✅

Total: ~100KB legacy + ~10KB new
```

### After Cleanup

```
src/
├── bitboard/ ✅
├── type.ts ✅
└── utils.ts ✅

Total: ~10KB clean foundation
```

---

## ⚠️ Breaking Changes

### What Breaks

1. **All imports from `cotulenh-core`** - main export removed
2. **Legacy API** - entire old API gone
3. **Legacy tests** - won't run anymore
4. **Behavioral tests** - temporarily broken (need new implementation)

### What Still Works

1. **Bitboard utilities** - fully functional
2. **Type definitions** - all types available
3. **Utility functions** - all working
4. **Documentation** - game rules intact

---

## 🎯 Post-Cleanup State

After cleanup, you'll have:

```
cotulenh-core/
├── src/
│   ├── bitboard/ (complete, tested)
│   ├── type.ts (types)
│   └── utils.ts (utilities)
│
├── __tests__/
│   ├── behavior/ (will need new API)
│   ├── bitboard/ (working)
│   └── test-helpers.ts
│
└── docs/
    ├── context/ (game rules)
    ├── legacy-square-by-square-approaches/ (patterns)
    ├── README.md
    └── COMPLETE_REBUILD_PLAN.md
```

**Status:** Clean slate, ready to build Phase 1 (Core Foundation)

---

## 🔄 Recovery Plan (If Needed)

If you need to rollback:

```bash
# Restore from git
git checkout src/legacy/
git checkout __tests__/legacy/
git checkout src/cotulenh.ts
git checkout src/deploy-move.ts
git checkout docs/implementation-tracking/
git checkout docs/MIGRATION_STATUS.md
```

**Recommendation:** Create a git tag before cleanup:

```bash
git tag legacy-backup-2025-10-15
git push origin legacy-backup-2025-10-15
```

---

## ✅ Ready to Execute?

Run this command to execute cleanup:

```bash
bash -c "$(cat CLEANUP_EXECUTION.md | grep -A 100 '#!/bin/bash' | head -20)"
```

Or manually:

1. Review files to delete
2. Create git tag backup
3. Run cleanup commands
4. Verify structure
5. Start Phase 1 implementation

---

**After cleanup, proceed to Phase 1 of COMPLETE_REBUILD_PLAN.md** 🚀
