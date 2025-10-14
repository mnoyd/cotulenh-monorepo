# Documentation Organization Plan

## Recommended Directory Structure

Moving the documentation to a more general location for better accessibility and
following standard project conventions:

### Option 1: `docs/` Directory (Standard Documentation)

```
docs/
├── README.md                           # Main index and navigation
├── ORGANIZATION.md                     # Organization plan
│
├── spec/                              # Original spec files
│   ├── requirements.md                # Project requirements
│   ├── design.md                     # Documentation design
│   └── tasks.md                      # Implementation tasks
│
├── system-analysis/
│   ├── dependency-analysis.md
│   └── data-flow-analysis.md
│
├── game-rules/
│   ├── pieces/
│   │   ├── commander.md
│   │   ├── infantry-engineer-antiair.md
│   │   ├── militia.md
│   │   ├── tank.md
│   │   ├── artillery.md
│   │   ├── missile.md
│   │   ├── airforce.md
│   │   ├── navy.md
│   │   └── headquarter.md
│   │
│   ├── terrain/
│   │   ├── board-layout.md
│   │   ├── zones-masks.md
│   │   ├── river-crossing.md
│   │   └── placement-restrictions.md
│   │
│   ├── stacks/
│   │   ├── combination-rules.md
│   │   ├── deployment-mechanics.md
│   │   ├── splitting-movement.md
│   │   └── combined-movement.md
│   │
│   ├── special-mechanics/
│   │   ├── heroic-promotion.md
│   │   ├── air-defense.md
│   │   ├── commander-exposure.md
│   │   └── capture-types.md
│   │
│   └── data-formats/
│       ├── fen-format.md
│       ├── san-notation.md
│       ├── internal-state.md
│       └── game-ending.md
│
├── api/
│   ├── initialization.md
│   ├── move-validation-cycle.md
│   ├── state-queries.md
│   └── request-response-examples.md
│
├── validation/
│   ├── piece-mechanics.md
│   ├── api-patterns.md
│   ├── game-flow.md
│   └── api-test.ts
│
└── reference/
    ├── complete-piece-behavior.md
    ├── complete-game-mechanics.md
    └── external-api-guide.md
```

### Option 2: `context/` Directory (AI Context Focus)

```
context/
├── README.md                           # AI-friendly navigation
├── INDEX.md                           # Structured index for AI agents
│
├── analysis/
│   ├── codebase-dependencies.md
│   └── data-flow-patterns.md
│
├── rules/
│   ├── pieces/
│   │   └── [all piece files with cleaner names]
│   ├── board/
│   │   └── [terrain and layout files]
│   ├── mechanics/
│   │   └── [special mechanics files]
│   └── formats/
│       └── [data format files]
│
├── integration/
│   ├── api-patterns.md
│   ├── usage-examples.md
│   └── request-response.md
│
├── validation/
│   └── [validation files]
│
└── complete/
    ├── game-encyclopedia.md
    ├── api-reference.md
    └── porting-guide.md
```

## File Movement Commands

### Option 1: Move to `docs/` Directory

```bash
# Create the docs directory structure
mkdir -p docs/{spec,system-analysis,game-rules/{pieces,terrain,stacks,special-mechanics,data-formats},api,validation,reference}

# Move spec files
mv .kiro/specs/comprehensive-documentation/{requirements,design,tasks}.md docs/spec/

# Move main navigation files
mv .kiro/specs/comprehensive-documentation/{README,ORGANIZATION}.md docs/

# Move system analysis files
mv .kiro/specs/comprehensive-documentation/dependency-analysis.md docs/system-analysis/
mv .kiro/specs/comprehensive-documentation/data-flow-analysis.md docs/system-analysis/

# Move and rename piece files (cleaner names)
mv .kiro/specs/comprehensive-documentation/piece-mechanics-commander.md docs/game-rules/pieces/commander.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-infantry-engineer-antiair.md docs/game-rules/pieces/infantry-engineer-antiair.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-militia.md docs/game-rules/pieces/militia.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-tank.md docs/game-rules/pieces/tank.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-artillery.md docs/game-rules/pieces/artillery.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-missile.md docs/game-rules/pieces/missile.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-airforce.md docs/game-rules/pieces/airforce.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-navy.md docs/game-rules/pieces/navy.md
mv .kiro/specs/comprehensive-documentation/piece-mechanics-headquarter.md docs/game-rules/pieces/headquarter.md

# Move and rename terrain files
mv .kiro/specs/comprehensive-documentation/terrain-board-layout.md docs/game-rules/terrain/board-layout.md
mv .kiro/specs/comprehensive-documentation/terrain-zones-masks.md docs/game-rules/terrain/zones-masks.md
mv .kiro/specs/comprehensive-documentation/heavy-piece-river-crossing.md docs/game-rules/terrain/river-crossing.md
mv .kiro/specs/comprehensive-documentation/piece-placement-restrictions.md docs/game-rules/terrain/placement-restrictions.md

# Move and rename stack files
mv .kiro/specs/comprehensive-documentation/stack-combination-rules.md docs/game-rules/stacks/combination-rules.md
mv .kiro/specs/comprehensive-documentation/deployment-mechanics.md docs/game-rules/stacks/deployment-mechanics.md
mv .kiro/specs/comprehensive-documentation/stack-splitting-movement.md docs/game-rules/stacks/splitting-movement.md
mv .kiro/specs/comprehensive-documentation/combined-piece-movement.md docs/game-rules/stacks/combined-movement.md

# Move and rename special mechanics files
mv .kiro/specs/comprehensive-documentation/heroic-promotion-system.md docs/game-rules/special-mechanics/heroic-promotion.md
mv .kiro/specs/comprehensive-documentation/air-defense-system.md docs/game-rules/special-mechanics/air-defense.md
mv .kiro/specs/comprehensive-documentation/commander-exposure-rules.md docs/game-rules/special-mechanics/commander-exposure.md
mv .kiro/specs/comprehensive-documentation/capture-types-mechanics.md docs/game-rules/special-mechanics/capture-types.md

# Move and rename data format files
mv .kiro/specs/comprehensive-documentation/fen-format-construction.md docs/game-rules/data-formats/fen-format.md
mv .kiro/specs/comprehensive-documentation/san-notation-construction.md docs/game-rules/data-formats/san-notation.md
mv .kiro/specs/comprehensive-documentation/internal-game-state-representation.md docs/game-rules/data-formats/internal-state.md
mv .kiro/specs/comprehensive-documentation/game-ending-conditions.md docs/game-rules/data-formats/game-ending.md

# Move and rename API files
mv .kiro/specs/comprehensive-documentation/game-initialization-pattern.md docs/api/initialization.md
mv .kiro/specs/comprehensive-documentation/move-validation-execution-cycle.md docs/api/move-validation-cycle.md
mv .kiro/specs/comprehensive-documentation/game-state-query-interface.md docs/api/state-queries.md
mv .kiro/specs/comprehensive-documentation/complete-request-response-examples.md docs/api/request-response-examples.md

# Move validation files
mv .kiro/specs/comprehensive-documentation/piece-mechanics-validation.md docs/validation/piece-mechanics.md
mv .kiro/specs/comprehensive-documentation/api-patterns-validation.md docs/validation/api-patterns.md
mv .kiro/specs/comprehensive-documentation/game-flow-validation.md docs/validation/game-flow.md
mv .kiro/specs/comprehensive-documentation/api-validation-test.ts docs/validation/api-test.ts

# Move reference files
mv .kiro/specs/comprehensive-documentation/complete-piece-behavior-reference.md docs/reference/complete-piece-behavior.md
mv .kiro/specs/comprehensive-documentation/complete-game-mechanics-reference.md docs/reference/complete-game-mechanics.md
mv .kiro/specs/comprehensive-documentation/external-api-usage-guide.md docs/reference/external-api-guide.md

# Remove the now-empty spec directory
rmdir .kiro/specs/comprehensive-documentation
```

### Option 2: Move to `context/` Directory (AI-Focused)

```bash
# Create the context directory structure
mkdir -p context/{analysis,rules/{pieces,board,mechanics,formats},integration,validation,complete}

# Move and organize for AI consumption
mv .kiro/specs/comprehensive-documentation/dependency-analysis.md context/analysis/codebase-dependencies.md
mv .kiro/specs/comprehensive-documentation/data-flow-analysis.md context/analysis/data-flow-patterns.md

# Move piece files to rules/pieces with cleaner names
mv .kiro/specs/comprehensive-documentation/piece-mechanics-*.md context/rules/pieces/
# (rename them to remove "piece-mechanics-" prefix)

# Move terrain files to rules/board
mv .kiro/specs/comprehensive-documentation/terrain-*.md context/rules/board/
mv .kiro/specs/comprehensive-documentation/*-river-crossing.md context/rules/board/
mv .kiro/specs/comprehensive-documentation/piece-placement-restrictions.md context/rules/board/

# Move special mechanics
mv .kiro/specs/comprehensive-documentation/heroic-promotion-system.md context/rules/mechanics/
mv .kiro/specs/comprehensive-documentation/air-defense-system.md context/rules/mechanics/
mv .kiro/specs/comprehensive-documentation/commander-exposure-rules.md context/rules/mechanics/
mv .kiro/specs/comprehensive-documentation/capture-types-mechanics.md context/rules/mechanics/

# Move data formats
mv .kiro/specs/comprehensive-documentation/*-format*.md context/rules/formats/
mv .kiro/specs/comprehensive-documentation/*-notation*.md context/rules/formats/
mv .kiro/specs/comprehensive-documentation/internal-game-state*.md context/rules/formats/

# Move API integration files
mv .kiro/specs/comprehensive-documentation/game-initialization*.md context/integration/
mv .kiro/specs/comprehensive-documentation/move-validation*.md context/integration/
mv .kiro/specs/comprehensive-documentation/*request-response*.md context/integration/

# Create AI-friendly index
cat > context/INDEX.md << 'EOF'
# CoTuLenh Context Index for AI Agents

## Navigation Structure
- analysis/ - Codebase structure and data flow
- rules/ - Complete game mechanics and rules
- integration/ - API patterns and usage
- validation/ - Cross-validation documents
- complete/ - Comprehensive reference documents

## Processing Order for AI Agents
1. Read analysis/codebase-dependencies.md
2. Read analysis/data-flow-patterns.md
3. Process all files in rules/ directory
4. Study integration/ for API patterns
5. Use complete/ for final reference
EOF
```

## Benefits of Moving to `docs/` or `context/`

### `docs/` Directory Benefits:

1. **Standard Convention**: Follows common project documentation patterns
2. **General Accessibility**: Easy for developers, AI agents, and tools to find
3. **Integration Friendly**: Works well with documentation generators and GitHub
   Pages
4. **Professional Structure**: Clear separation from implementation code
5. **Scalable**: Room for additional documentation types (tutorials, examples,
   etc.)

### `context/` Directory Benefits:

1. **AI-Optimized**: Specifically designed for AI agent consumption
2. **Context-Focused**: Emphasizes the "big picture" understanding you mentioned
3. **Processing-Friendly**: Structured for systematic AI analysis
4. **Semantic Organization**: Groups by conceptual relationships rather than
   file types
5. **Generalization Ready**: Perfect for creating reusable context patterns

## Updated Navigation Examples

### For `docs/` Structure:

```markdown
### 🔍 System Analysis

- [Dependency Analysis](system-analysis/dependency-analysis.md)
- [Data Flow Analysis](system-analysis/data-flow-analysis.md)

### 🎯 Game Rules

#### Pieces

- [Commander](game-rules/pieces/commander.md)
- [Infantry, Engineer, Anti-Air](game-rules/pieces/infantry-engineer-antiair.md)

### 🔌 API Integration

- [Initialization](api/initialization.md)
- [Move Validation Cycle](api/move-validation-cycle.md)
```

### For `context/` Structure:

```markdown
### 📊 Codebase Analysis

- [Dependencies](analysis/codebase-dependencies.md)
- [Data Flow](analysis/data-flow-patterns.md)

### 🎮 Game Rules

- [Pieces](rules/pieces/)
- [Board & Terrain](rules/board/)
- [Special Mechanics](rules/mechanics/)

### 🔗 Integration Patterns

- [API Usage](integration/api-patterns.md)
- [Examples](integration/usage-examples.md)
```

## Recommendation

I recommend the **`context/` directory approach** because:

1. **Aligns with Your Goals**: You mentioned building "context of big picture" -
   this structure emphasizes that
2. **AI-Agent Optimized**: Designed specifically for systematic AI consumption
3. **Generalization Ready**: The structure can be reused for other complex
   system analysis
4. **Semantic Organization**: Groups by meaning rather than just file types
5. **Processing Order**: Clear navigation path for AI agents to follow

The `context/` approach treats the documentation as a comprehensive knowledge
base for understanding the system, which matches your emphasis on deep
understanding before implementation.

## Next Steps

Choose your preferred approach:

- **`docs/`** - If you want standard documentation conventions
- **`context/`** - If you want AI-optimized knowledge organization

Then run the corresponding movement commands to reorganize all the files with
cleaner names and better structure.
