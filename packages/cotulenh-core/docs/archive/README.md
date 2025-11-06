# Documentation Archive

This directory contains deprecated documentation that has been superseded by the
consolidated documentation structure. Content is preserved for historical
reference and context.

## Archive Organization

### `/legacy-implementations/`

Contains documentation for deprecated implementation approaches:

- Virtual state overlay architecture (deprecated in favor of action-based
  deploy)
- Legacy square-by-square approaches
- Outdated bitboard exploration attempts

### `/historical-discussions/`

Contains historical architecture discussions and implementation reviews:

- Action-based deploy implementation reviews
- Recombine system analysis and redesign documents
- Deploy session comparisons and roadmaps

### `/redundant-context/`

Contains context files that have been consolidated into the current
documentation:

- Individual piece mechanics files (consolidated into PIECE-REFERENCE.md)
- Scattered game mechanics files (consolidated into GAME-RULES.md)
- Implementation-specific context (consolidated into IMPLEMENTATION-GUIDE.md)

### `/performance-analysis/`

Contains performance analysis documents that are no longer actively maintained:

- Verbose mode performance analysis
- Bottleneck summaries

## Why Content Was Deprecated

### Virtual State Architecture

The virtual state overlay approach was deprecated because:

- Complex state management with difficult debugging
- Performance overhead from state copying
- Maintenance complexity with dual state systems
- Action-based deploy proved more reliable and maintainable

### Legacy Square-by-Square Approaches

These approaches were superseded by:

- More efficient bitboard techniques (in alternatives/bitboard/)
- Better understanding of CoTuLenh-specific optimizations
- Cleaner architectural patterns

### Scattered Context Files

Individual context files were consolidated because:

- Redundant information across multiple files
- Difficult navigation and maintenance
- AI agent consumption inefficiency
- Better organization in consolidated documents

### Historical Implementation Discussions

These discussions served their purpose but are no longer active:

- Implementation decisions have been made
- Current architecture is documented in current/
- Alternative approaches are explored in alternatives/

## Accessing Archived Content

While this content is deprecated, it may still contain valuable historical
context:

- Implementation decision rationale
- Lessons learned from failed approaches
- Detailed analysis that informed current decisions
- Edge cases and considerations that shaped current design

## Maintenance Policy

Archived content is:

- **Preserved**: Not deleted, maintained for historical reference
- **Not Updated**: No longer actively maintained or updated
- **Not Referenced**: Not linked from active documentation
- **Searchable**: Available for research and historical analysis

For current documentation, see:

- `docs/current/` - Current codebase documentation
- `docs/alternatives/` - Alternative architecture exploration
