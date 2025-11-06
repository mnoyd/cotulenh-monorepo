# Documentation Redirect Guide

This document provides mapping from old file locations to new consolidated
structure for external references and bookmarks.

## Major Structural Changes (November 2025)

### Overview

- **126 files consolidated into 29 active documents**
- **Content preserved but reorganized for better navigation**
- **Deprecated content archived with full preservation**

## File Location Mapping

### Root Level Files

| Old Location                                           | New Location                           | Status       |
| ------------------------------------------------------ | -------------------------------------- | ------------ |
| `docs/context/complete-game-mechanics-reference.md`    | `docs/current/GAME-RULES.md`           | Consolidated |
| `docs/context/complete-piece-behavior-reference.md`    | `docs/current/PIECE-REFERENCE.md`      | Consolidated |
| `docs/context/PORTING-GUIDE.md`                        | `docs/current/MIGRATION-GUIDE.md`      | Enhanced     |
| `docs/context/external-api-usage-guide.md`             | `docs/current/API-GUIDE.md`            | Consolidated |
| `docs/context/fen-format-construction.md`              | `docs/current/DATA-FORMATS.md`         | Consolidated |
| `docs/context/san-notation-construction.md`            | `docs/current/DATA-FORMATS.md`         | Consolidated |
| `docs/implementation/board-representation-analysis.md` | `docs/current/IMPLEMENTATION-GUIDE.md` | Consolidated |

### Context Directory (40+ files)

**All context files have been consolidated into current documentation:**

| Context File Pattern   | New Location                      | Section                   |
| ---------------------- | --------------------------------- | ------------------------- |
| `piece-mechanics-*.md` | `docs/current/PIECE-REFERENCE.md` | Individual piece sections |
| `stack-*.md`           | `docs/current/GAME-RULES.md`      | Stack System section      |
| `heroic-*.md`          | `docs/current/GAME-RULES.md`      | Heroic Promotion section  |
| `air-defense-*.md`     | `docs/current/GAME-RULES.md`      | Air Defense section       |
| `commander-*.md`       | `docs/current/GAME-RULES.md`      | Commander Rules section   |
| `terrain-*.md`         | `docs/current/GAME-RULES.md`      | Terrain System section    |
| `capture-*.md`         | `docs/current/GAME-RULES.md`      | Capture Types section     |
| `game-*.md`            | `docs/current/API-GUIDE.md`       | Relevant API sections     |
| `move-*.md`            | `docs/current/API-GUIDE.md`       | Move API sections         |
| `data-*.md`            | `docs/current/DATA-FORMATS.md`    | Format specifications     |

**Archive Location:** `docs/archive/redundant-context/context/`

### Implementation Discussions

| Old Location                               | New Location                           | Status                |
| ------------------------------------------ | -------------------------------------- | --------------------- |
| `docs/deploy-action-based-architecture/`   | `docs/archive/historical-discussions/` | Archived (completed)  |
| `docs/legacy-square-by-square-approaches/` | `docs/archive/legacy-implementations/` | Archived (deprecated) |
| `docs/bitboard-implementation/`            | `docs/archive/legacy-implementations/` | Archived (superseded) |
| `docs/implementation-tracking/`            | `docs/archive/historical-discussions/` | Archived (completed)  |

### Scattered Root Files

| Old Location                     | New Location                           | Status   |
| -------------------------------- | -------------------------------------- | -------- |
| `docs/ACTION-BASED-DEPLOY-*.md`  | `docs/archive/historical-discussions/` | Archived |
| `docs/RECOMBINE-*.md`            | `docs/archive/historical-discussions/` | Archived |
| `docs/DEPLOY-*.md`               | `docs/archive/historical-discussions/` | Archived |
| `docs/ARCHITECTURE-MIGRATION.md` | `docs/archive/historical-discussions/` | Archived |
| `docs/CONSOLIDATION-SUMMARY.md`  | `docs/archive/historical-discussions/` | Archived |

## Content Mapping by Topic

### Game Rules and Mechanics

**Old Sources:** 40+ context files  
**New Location:** `docs/current/GAME-RULES.md`

**Sections:**

- Board and Terrain System (from terrain-\*.md files)
- All 11 Piece Types (from piece-mechanics-\*.md files)
- Stack System (from stack-\*.md files)
- Deploy Mechanics (from stack-splitting-movement.md)
- Heroic Promotion (from heroic-\*.md files)
- Air Defense System (from air-defense-\*.md files)
- Commander Rules (from commander-\*.md files)
- Capture Types (from capture-\*.md files)
- Game Ending Conditions (from game-\*.md files)

### API Documentation

**Old Sources:** 8+ API and usage files  
**New Location:** `docs/current/API-GUIDE.md`

**Consolidated From:**

- `context/external-api-usage-guide.md`
- `context/game-initialization-pattern.md`
- `context/move-validation-execution-cycle.md`
- `context/game-state-query-interface.md`
- `context/complete-request-response-examples.md`
- Various API flow documentation files

### Implementation Architecture

**Old Sources:** 20+ implementation files  
**New Location:** `docs/current/IMPLEMENTATION-GUIDE.md`

**Consolidated From:**

- `implementation/board-representation-analysis.md`
- `context/codebase-dependencies.md`
- `context/data-flow-analysis.md`
- `context/internal-game-state-representation.md`
- Various implementation-specific files

### Data Formats

**Old Sources:** 5+ format files  
**New Location:** `docs/current/DATA-FORMATS.md`

**Consolidated From:**

- `context/fen-format-construction.md`
- `context/san-notation-construction.md`
- `context/internal-game-state-representation.md`
- Various format specification files

## External Reference Updates

### Code Comments

**Update patterns:**

```typescript
// OLD: See docs/context/piece-mechanics-commander.md
// NEW: See docs/current/PIECE-REFERENCE.md (Commander section)

// OLD: See docs/context/complete-game-mechanics-reference.md
// NEW: See docs/current/GAME-RULES.md

// OLD: See docs/context/external-api-usage-guide.md
// NEW: See docs/current/API-GUIDE.md
```

### README References

**Update patterns:**

```markdown
<!-- OLD -->

[Game Rules](docs/context/complete-game-mechanics-reference.md)
[API Guide](docs/context/external-api-usage-guide.md)
[Porting Guide](docs/context/PORTING-GUIDE.md)

<!-- NEW -->

[Game Rules](docs/current/GAME-RULES.md) [API Guide](docs/current/API-GUIDE.md)
[Migration Guide](docs/current/MIGRATION-GUIDE.md)
```

### Bookmark Updates

**Common bookmark redirects:**

- `docs/context/` → `docs/current/`
- Individual piece files → `docs/current/PIECE-REFERENCE.md`
- Game mechanics files → `docs/current/GAME-RULES.md`
- API files → `docs/current/API-GUIDE.md`
- Implementation files → `docs/current/IMPLEMENTATION-GUIDE.md`

## Search and Discovery

### Finding Archived Content

**If you need historical content:**

1. **Check Archive Index:** `docs/archive/ARCHIVE-INDEX.md`
2. **Search Archive:** All content preserved in `docs/archive/`
3. **Version History:** `docs/archive/VERSION-HISTORY.md`

### Finding Consolidated Content

**Use the new structure:**

1. **Current Implementation:** `docs/current/README.md`
2. **Alternative Approaches:** `docs/alternatives/README.md`
3. **Deep Analysis:** `docs/extracted-information/`
4. **Quick Reference:** `docs/INDEX.md`

## Migration Timeline

### Immediate (November 2025)

- ✅ All files moved to new structure
- ✅ Archive created with full preservation
- ✅ New navigation documents created
- ✅ Cross-references updated in active documents

### Short Term (December 2025)

- [ ] External reference updates in code comments
- [ ] README file updates in related repositories
- [ ] Bookmark migration for team members
- [ ] Documentation of new maintenance procedures

### Long Term (Q1 2026)

- [ ] Validation that all external references updated
- [ ] Archive cleanup (if any content proves truly unused)
- [ ] Enhanced cross-references in consolidated documents
- [ ] Performance analysis of new structure

## Support

### Questions About Redirects

**Can't find content?**

1. Check `docs/archive/ARCHIVE-INDEX.md` for detailed mapping
2. Search `docs/archive/` for historical content
3. Check consolidated documents for integrated content

**Need specific information?**

1. Use `docs/INDEX.md` for topic-based navigation
2. Check `docs/current/README.md` for current implementation
3. Review `docs/alternatives/README.md` for alternative approaches

**Broken links?**

1. Check this redirect guide for new locations
2. Update references using the mapping tables above
3. Report persistent issues for documentation updates
