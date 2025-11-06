# Archive Index

This document provides a detailed mapping of archived content and explanations
for why each piece was deprecated.

## Archive Structure

```
docs/archive/
├── README.md                           # Archive overview and policies
├── ARCHIVE-INDEX.md                    # This file - detailed content mapping
├── legacy-implementations/             # Deprecated implementation approaches
│   ├── legacy-square-by-square-approaches/  # Old architectural discussions
│   └── bitboard-implementation/        # Early bitboard exploration (superseded)
├── historical-discussions/             # Completed implementation discussions
│   ├── deploy-action-based-architecture/    # Action-based deploy implementation
│   ├── implementation-tracking/        # Phase-based implementation tracking
│   ├── ACTION-BASED-DEPLOY-*.md        # Deploy implementation reviews
│   ├── RECOMBINE-*.md                  # Recombine system analysis
│   ├── DEPLOY-*.md                     # Deploy system discussions
│   ├── ARCHITECTURE-MIGRATION.md       # Migration planning
│   ├── CONSOLIDATION-SUMMARY.md        # Documentation consolidation notes
│   ├── DELAYED-VALIDATION-IMPLEMENTATION.md  # Validation strategy
│   ├── CHECKMATE-DETECTION-TODO.md     # Checkmate detection planning
│   ├── TESTING-RECOMMENDATIONS.md      # Testing strategy discussions
│   └── STRUCTURE.md                    # Old structure documentation
├── redundant-context/                  # Context files consolidated elsewhere
│   └── context/                        # 40+ individual context files
└── performance-analysis/               # Performance analysis documents
    └── performance/                    # Verbose mode performance analysis
```

## Deprecation Rationale

### Legacy Implementations (`legacy-implementations/`)

#### `legacy-square-by-square-approaches/`

**Deprecated:** November 2025  
**Reason:** Superseded by modern bitboard techniques and better architectural
understanding

**Content:**

- Virtual state overlay architecture (complex, hard to debug)
- Square-by-square move generation (inefficient)
- Immutable state approaches (memory overhead)
- Command pattern overuse (unnecessary complexity)

**Superseded By:**

- `docs/alternatives/bitboard/` - Modern bitboard architecture
- `docs/current/IMPLEMENTATION-GUIDE.md` - Current 0x88 approach
- `docs/current/MIGRATION-GUIDE.md` - Incremental improvement strategies

#### `bitboard-implementation/`

**Deprecated:** November 2025  
**Reason:** Early exploration superseded by comprehensive bitboard architecture
design

**Content:**

- Basic bitboard concepts (incomplete)
- Partial CoTuLenh adaptations (outdated)
- Performance assumptions (unvalidated)
- Implementation fragments (incomplete)

**Superseded By:**

- `docs/alternatives/bitboard/BITBOARD-ARCHITECTURE.md` - Comprehensive design
- `docs/alternatives/bitboard/COTULENH-BITBOARD-ADAPTATIONS.md` - Complete
  analysis
- `docs/alternatives/bitboard/BITBOARD-PERFORMANCE-ANALYSIS.md` - Validated
  benchmarks

### Historical Discussions (`historical-discussions/`)

#### `deploy-action-based-architecture/`

**Deprecated:** November 2025  
**Reason:** Implementation completed, decisions made, architecture documented

**Content:**

- Implementation planning and gap analysis
- Critical risk assessments
- SAN parser specifications
- FEN handling strategies

**Superseded By:**

- `docs/current/API-GUIDE.md` - Current deploy API
- `docs/current/IMPLEMENTATION-GUIDE.md` - Action-based architecture
- `docs/current/DATA-FORMATS.md` - FEN/SAN specifications

#### `implementation-tracking/`

**Deprecated:** November 2025  
**Reason:** Phase-based implementation completed, tracking no longer needed

**Content:**

- Phase 1-3 implementation tracking
- Completion checklists
- AI agent guides
- Status tracking

**Superseded By:**

- `docs/current/MIGRATION-GUIDE.md` - Ongoing improvement strategies
- `docs/current/TESTING-GUIDE.md` - Validation approaches

#### Action-Based Deploy Files

**Files:** `ACTION-BASED-DEPLOY-*.md`  
**Deprecated:** November 2025  
**Reason:** Deploy implementation completed and documented

**Content:**

- Implementation reviews and summaries
- Refactoring specifications
- Gap analysis and resolution

**Superseded By:**

- `docs/current/API-GUIDE.md` - Deploy API documentation
- `docs/current/IMPLEMENTATION-GUIDE.md` - Current architecture

#### Recombine System Files

**Files:** `RECOMBINE-*.md`  
**Deprecated:** November 2025  
**Reason:** Recombine system analysis completed, current implementation
documented

**Content:**

- Recombine logic analysis and redesign
- Integration guides and summaries
- Terrain validation strategies

**Superseded By:**

- `docs/current/GAME-RULES.md` - Stack combination rules
- `docs/current/API-GUIDE.md` - Recombine API
- `docs/extracted-information/known-issues-bug-catalog.md` - Known issues

#### Deploy System Files

**Files:** `DEPLOY-*.md`  
**Deprecated:** November 2025  
**Reason:** Deploy system design completed, current implementation documented

**Content:**

- Deploy engine design
- Session comparisons
- Implementation roadmaps

**Superseded By:**

- `docs/current/GAME-RULES.md` - Deploy mechanics
- `docs/current/API-GUIDE.md` - Deploy API
- `docs/current/IMPLEMENTATION-GUIDE.md` - Deploy architecture

#### Architecture and Planning Files

**Files:** `ARCHITECTURE-MIGRATION.md`, `CONSOLIDATION-SUMMARY.md`, etc.  
**Deprecated:** November 2025  
**Reason:** Planning completed, current state documented

**Content:**

- Migration planning strategies
- Documentation consolidation notes
- Testing recommendations
- Structure documentation

**Superseded By:**

- `docs/current/MIGRATION-GUIDE.md` - Current migration strategies
- `docs/current/TESTING-GUIDE.md` - Testing approaches
- `docs/current/README.md` - Current structure

### Redundant Context (`redundant-context/`)

#### `context/` Directory

**Deprecated:** November 2025  
**Reason:** 40+ individual files consolidated into comprehensive documents

**Content:**

- Individual piece mechanics files → `docs/current/PIECE-REFERENCE.md`
- Game mechanics fragments → `docs/current/GAME-RULES.md`
- API usage examples → `docs/current/API-GUIDE.md`
- Implementation details → `docs/current/IMPLEMENTATION-GUIDE.md`
- Data format specifications → `docs/current/DATA-FORMATS.md`

**Consolidation Benefits:**

- Single source of truth for each topic
- Eliminated redundancy and contradictions
- Improved AI agent consumption
- Better navigation and maintenance

### Performance Analysis (`performance-analysis/`)

#### `performance/` Directory

**Deprecated:** November 2025  
**Reason:** Verbose mode performance analysis completed, optimizations
implemented

**Content:**

- Verbose bottleneck summaries
- Performance analysis reports

**Superseded By:**

- `docs/current/IMPLEMENTATION-GUIDE.md` - Performance characteristics
- `docs/alternatives/bitboard/BITBOARD-PERFORMANCE-ANALYSIS.md` - Alternative
  performance

## Version History

### November 2025 - Major Consolidation

- Consolidated 126 files into 15 core documents
- Archived deprecated implementation approaches
- Created alternative architecture exploration space
- Established clear maintenance boundaries

## Recovery Information

If archived content needs to be referenced:

1. **Historical Context**: All archived content remains searchable
2. **Implementation Decisions**: Rationale preserved in archived discussions
3. **Lessons Learned**: Failed approaches documented for future reference
4. **Edge Cases**: Detailed analysis preserved in archived context files

## Maintenance Policy

- **No Updates**: Archived content is frozen at deprecation time
- **No Links**: Active documentation does not link to archived content
- **Preservation**: Content preserved for historical reference
- **Search**: Available for research and analysis
