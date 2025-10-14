# Documentation Changelog

## 2025-10-14 - Major Reorganization

### Added

- **`docs/` folder structure** - Organized documentation hierarchy
- **`docs/README.md`** - Main documentation hub with navigation
- **`docs/INDEX.md`** - Complete file index with 45+ documents
- **`docs/STRUCTURE.md`** - Visual directory tree and relationships
- **`docs/CHANGELOG.md`** - This file
- **`docs/implementation/`** - New folder for architecture discussions
- **`docs/implementation/board-representation-analysis.md`** - Complete
  analysis:
  - Why 0x88 array (not bitboards) for CoTuLenh
  - Lessons from Xiangqi and Shogi
  - Performance analysis with 19 pieces per side
  - Optimal architecture design
  - Implementation strategy and migration plan

### Changed

- **Moved** all 45 context files from `context/` → `docs/context/`
- **Updated** `docs/context/README.md` with new structure
- **Preserved** all existing documentation content

### Structure

```
docs/
├── README.md                    # Main hub
├── INDEX.md                     # Quick reference (10KB)
├── STRUCTURE.md                 # Visual overview (8KB)
├── CHANGELOG.md                 # This file
├── context/                     # Game rules (45 files)
│   ├── PORTING-GUIDE.md        # Master porting guide
│   ├── IMPLEMENTATION-CHECKLIST.md  # 118-point validation
│   └── ... (43 more files)
└── implementation/              # Architecture (1+ files)
    └── board-representation-analysis.md  # 15KB analysis
```

### Key Insights Documented

#### Board Representation Decision

- **Conclusion:** Use 0x88 array + piece lists (NOT bitboards)
- **Rationale:**
  - CoTuLenh has 19 pieces per side (not 12 as initially thought)
  - Stay-captures break bitboard model (attack ≠ move squares)
  - Variable blocking rules per piece type
  - Circular air defense zones (not ray-based)
  - Xiangqi and Shogi use similar approaches

#### Performance Analysis

- **Move generation:** ~2-5ms (pseudo-legal)
- **Legal filtering:** ~10-20ms
- **Total:** ~12-25ms (excellent for UI)
- **Comparison:** Similar to Shogi engines (accounting for TypeScript overhead)

### Benefits

- ✅ Clear separation: game rules vs implementation
- ✅ Easy navigation with 3 entry points
- ✅ Implementation discussions separate from context
- ✅ Better for picking up context
- ✅ Scalable structure for future additions

### Statistics

- **Total files:** 48 (45 context + 1 implementation + 3 navigation)
- **Total size:** ~150,000+ words
- **Reading time:** 4-8 hours for complete mastery

---

## Future Additions Planned

### Implementation Documentation

- [ ] Move generation optimization strategies
- [ ] Deploy state management patterns
- [ ] Air defense calculation algorithms
- [ ] Heroic promotion timing details
- [ ] Extended FEN with deploy state
- [ ] Testing strategy and coverage
- [ ] Performance benchmarking methodology
- [ ] Piece list maintenance patterns
- [ ] Terrain mask optimization
- [ ] Stack validation logic

### Context Documentation

- [ ] Edge case compilation
- [ ] Tournament rules (if applicable)
- [ ] Notation ambiguity resolution
- [ ] Position analysis examples
- [ ] Opening principles (when theory develops)

---

## Version History

### v1.0 (2025-10-14)

- Initial organized structure
- 45 context documents
- 1 implementation analysis
- 3 navigation documents
- Complete porting guide
- 118-point validation checklist
