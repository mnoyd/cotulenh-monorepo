# Legacy Code - Reference Only

**Status:** 🔴 Archived for reference  
**Build:** Still compiled for backward compatibility via stubs  
**Date Moved:** 2025-10-15

---

## What's in This Folder

This folder contains the **original monolithic implementation** of CoTuLenh that
is being replaced with a clean, modular architecture.

### Files

- **`cotulenh.ts`** (47KB) - Original monolithic game engine class
- **`air-defense.ts`** (4.9KB) - Old air defense loop implementation
- **`move-apply.ts`** (19.8KB) - Old move execution with command pattern
- **`move-generation.ts`** (19.5KB) - Old move generation logic
- **`deploy-move.ts`** (9.2KB) - Old deploy move system

**Total:** ~100KB of legacy code

---

## Why It's Here

1. **Reference:** Preserved for understanding original implementation details
2. **Backward Compatibility:** Temporary stubs in `src/` re-export from here
3. **Gradual Migration:** Allows building new system alongside old
4. **Testing:** Behavioral tests still run against this code (via stubs)

---

## Migration Status

The new implementation is being built in parallel:

```
src/
├── bitboard/              ✅ Phase 1 in progress
│   ├── bitboard-utils.ts  ✅ Complete (Task 1.1-1.2)
│   ├── circle-masks.ts    🔄 Next (Task 1.3)
│   └── air-defense-bitboard.ts
│
├── core/                  🔜 Future
├── moves/                 🔜 Future
├── air-defense/           🔜 Future
└── deploy/                🔜 Future
```

---

## When Will This Be Removed?

This folder will be removed when:

1. ✅ New bitboard air defense is complete and tested
2. ✅ New modular architecture is fully implemented
3. ✅ All behavioral tests pass against new implementation
4. ✅ Performance benchmarks meet or exceed old implementation
5. ✅ Migration is approved and merged

**Expected:** End of Phase 3 (2-3 weeks)

---

## Important Notes

⚠️ **Do NOT modify files in this folder**  
⚠️ **Do NOT use as examples for new code**  
⚠️ **Do NOT copy patterns from here**

This code has known architectural issues that the new implementation solves:

- Monolithic design (1462 lines in one file)
- Poor separation of concerns
- Difficult to test in isolation
- Hard to maintain and extend

---

## See Also

- **New Implementation Plan:** `/docs/implementation-tracking/`
- **Architecture Decision:** `/docs/bitboard-implementation/`
- **Progress Tracker:** `/docs/implementation-tracking/STATUS.md`
