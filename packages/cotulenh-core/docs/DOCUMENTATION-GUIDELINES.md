# Documentation Guidelines

This document provides guidelines for maintaining and extending the CoTuLenh
documentation structure.

## Documentation Philosophy

### Core Principles

1. **Single Source of Truth:** Each concept documented exactly once
2. **Clear Boundaries:** Separate current implementation from alternative
   approaches
3. **AI-Friendly Structure:** Consistent formatting for optimal agent
   consumption
4. **Incremental Improvement:** Support gradual enhancement of current codebase
5. **Preserved History:** Archive deprecated content with clear rationale

### Content Categories

#### Current Implementation (`docs/current/`)

- **Purpose:** Document existing TypeScript codebase accurately
- **Focus:** What exists now, how to work with it, how to improve it
  incrementally
- **Audience:** Developers working with current implementation
- **Maintenance:** High priority, updated with code changes

#### Alternative Architectures (`docs/alternatives/`)

- **Purpose:** Explore future implementation possibilities
- **Focus:** Modern techniques, performance analysis, migration strategies
- **Audience:** Architects planning future implementations
- **Maintenance:** Medium priority, updated with research progress

#### Deep Analysis (`docs/extracted-information/`)

- **Purpose:** Comprehensive technical details and edge cases
- **Focus:** Implementation specifics, known issues, complex scenarios
- **Audience:** Developers needing deep technical understanding
- **Maintenance:** Low priority, updated when new issues discovered

#### Archive (`docs/archive/`)

- **Purpose:** Preserve historical content and deprecated approaches
- **Focus:** Historical context, lessons learned, deprecated implementations
- **Audience:** Researchers and maintainers needing historical context
- **Maintenance:** Minimal, content frozen at archival time

## Writing Standards

### Markdown Formatting

#### Document Structure

```markdown
# Document Title

Brief description of document purpose and scope.

## Section 1: Overview

- Use ## for major sections
- Use ### for subsections
- Use #### sparingly for detailed breakdowns

### Subsection 1.1

Content with consistent formatting.

## Section 2: Details

More detailed content.
```

#### Code Examples

````markdown
### Code Examples

Use fenced code blocks with language specification:

```typescript
// TypeScript example
interface GameState {
  board: Board
  turn: Color
}
```
````

```bash
# Shell commands
npm test
```

````

#### Lists and Structure
```markdown
### Lists

**Ordered lists for sequences:**
1. First step
2. Second step
3. Third step

**Unordered lists for collections:**
- Item one
- Item two
- Item three

**Definition lists for concepts:**
- **Term:** Definition of the term
- **Another Term:** Another definition
````

#### Cross-References

```markdown
### Cross-References

**Internal references (minimize):**

- See [Section Name](#section-name) in this document
- Reference [Other Document](other-document.md) only when necessary

**External references:**

- Link to specific sections: [Game Rules](current/GAME-RULES.md#piece-movement)
- Avoid deep linking chains
```

### Content Guidelines

#### Current Implementation Documentation

**Accuracy Requirements:**

- Document what actually exists in the codebase
- Include current limitations and workarounds
- Provide incremental improvement guidance
- Distinguish between current reality and ideal solutions

**Example Structure:**

```markdown
## Current Implementation

### How It Works Now

Description of current approach with code examples.

### Known Limitations

- Limitation 1: Description and impact
- Limitation 2: Description and workaround

### Incremental Improvements

1. **Short-term:** Immediate improvements possible
2. **Medium-term:** Larger changes that maintain compatibility
3. **Long-term:** Major architectural improvements
```

#### Alternative Architecture Documentation

**Research Requirements:**

- Provide thorough analysis and benchmarking
- Include concrete implementation guidance
- Compare with current approach objectively
- Maintain clear separation from current implementation

**Example Structure:**

```markdown
## Alternative Approach: [Name]

### Overview

Brief description and key benefits.

### Technical Analysis

Detailed technical approach with examples.

### Performance Comparison

| Metric | Current | Alternative | Improvement |
| ------ | ------- | ----------- | ----------- |
| Speed  | X ms    | Y ms        | Z% faster   |

### Implementation Strategy

Concrete steps for implementation.

### Migration Path

How to transition from current to alternative.
```

### AI Agent Optimization

#### Formatting for AI Consumption

**Consistent Structure:**

- Use standard markdown hierarchy (# ## ### ####)
- Include comprehensive examples within documents
- Minimize cross-document dependencies
- Use clear, descriptive headings

**Information Architecture:**

```markdown
# Document Title

Brief overview and scope.

## Quick Reference

Key information for immediate use.

## Detailed Explanation

Comprehensive coverage of topic.

## Examples

Complete, working examples.

## Edge Cases

Special scenarios and considerations.

## Related Information

Minimal cross-references to essential related content.
```

**Code Examples:**

- Include complete, runnable examples
- Provide context and explanation
- Show both typical usage and edge cases
- Include error handling where relevant

## Content Management

### Adding New Content

#### Decision Tree: Where Does Content Go?

```
New Content
├── About current implementation?
│   ├── Game rules/mechanics → current/GAME-RULES.md
│   ├── API usage → current/API-GUIDE.md
│   ├── Architecture details → current/IMPLEMENTATION-GUIDE.md
│   ├── Data formats → current/DATA-FORMATS.md
│   ├── Testing/validation → current/TESTING-GUIDE.md
│   └── Improvement strategies → current/MIGRATION-GUIDE.md
├── About alternative approaches?
│   ├── Bitboard techniques → alternatives/bitboard/
│   ├── Other architectures → alternatives/[approach]/
│   └── Comparisons → alternatives/references/
├── Deep technical analysis?
│   ├── Edge cases → extracted-information/edge-cases-special-mechanics.md
│   ├── Known issues → extracted-information/known-issues-bug-catalog.md
│   └── Implementation details → extracted-information/technical-implementation-details.md
└── Historical/deprecated?
    └── Archive with rationale → archive/
```

#### New Document Creation

**When to create new documents:**

- Content doesn't fit in existing consolidated documents
- Alternative architecture exploration requires dedicated space
- Reference material needs separate organization

**Document creation process:**

1. Determine appropriate directory based on content type
2. Create document with standard structure
3. Update parent README.md with navigation
4. Update docs/INDEX.md with new document
5. Add cross-references sparingly and only when essential

### Updating Existing Content

#### Consolidation Maintenance

**When updating consolidated documents:**

1. **Identify Section:** Find appropriate section in consolidated document
2. **Update Content:** Make changes within existing structure
3. **Maintain Consistency:** Ensure formatting matches document standards
4. **Check Cross-References:** Validate any references remain accurate
5. **Update Examples:** Ensure code examples are current and complete

**Example Update Process:**

```bash
# Update game rules
vim docs/current/GAME-RULES.md
# Find appropriate section (e.g., "## Piece Movement")
# Make changes within that section
# Ensure formatting consistency

# Update changelog
vim docs/CHANGELOG.md
# Add entry describing the change

# Validate cross-references
grep -r "GAME-RULES.md" docs/current/
# Ensure references are still accurate
```

#### Version Control Best Practices

**Commit Messages:**

```bash
# Good commit messages
git commit -m "docs: Update commander movement rules in GAME-RULES.md"
git commit -m "docs: Add bitboard performance analysis to alternatives/"
git commit -m "docs: Archive deprecated virtual state documentation"

# Include rationale for major changes
git commit -m "docs: Consolidate piece mechanics files into PIECE-REFERENCE.md

- Reduces maintenance overhead from 9 files to 1
- Eliminates redundant information
- Improves AI agent consumption efficiency"
```

**Change Documentation:**

- Update CHANGELOG.md for significant changes
- Document rationale for structural changes
- Maintain version history for major reorganizations

### Quality Assurance

#### Pre-Publication Checklist

**Content Quality:**

- [ ] Information is accurate and up-to-date
- [ ] Examples are complete and tested
- [ ] Formatting is consistent with guidelines
- [ ] Cross-references are minimal and accurate

**Structure Quality:**

- [ ] Content is in appropriate document/section
- [ ] Navigation is updated if needed
- [ ] Document hierarchy is logical
- [ ] AI agent optimization is maintained

**Maintenance Quality:**

- [ ] Changes are documented in changelog
- [ ] Version control commit is descriptive
- [ ] Future maintenance is considered
- [ ] Archive policy is followed if applicable

#### Regular Maintenance

**Monthly Tasks:**

- Review recent changes for consistency
- Validate cross-references and links
- Update examples with current code
- Check for content that should be consolidated

**Quarterly Tasks:**

- Assess document structure effectiveness
- Review AI agent optimization
- Update performance analysis and benchmarks
- Plan improvements and enhancements

**Annual Tasks:**

- Major structure review
- Archive policy assessment
- Version history comprehensive update
- Guidelines refinement based on experience

## Special Considerations

### AI Agent Optimization

#### Formatting for AI Consumption

**Consistent Patterns:**

- Use standard markdown elements consistently
- Include comprehensive examples within documents
- Structure information hierarchically
- Minimize parsing complexity

**Information Density:**

- Balance completeness with readability
- Include essential context within documents
- Avoid excessive cross-referencing
- Provide clear section boundaries

#### Testing AI Consumption

**Validation Methods:**

- Test document parsing with AI tools
- Verify information extraction accuracy
- Check cross-reference resolution
- Validate example completeness

### Performance Considerations

#### Document Size Management

**Size Guidelines:**

- Individual documents: 20-60 pages optimal
- Comprehensive coverage preferred over fragmentation
- Include examples and details within documents
- Balance completeness with navigability

**Loading Performance:**

- Consider document size for web viewing
- Use clear section headers for quick navigation
- Include table of contents for large documents
- Optimize for both human and AI consumption

### Future Evolution

#### Scalability Planning

**Structure Evolution:**

- Plan for additional alternative architectures
- Consider new analysis categories
- Maintain clear boundaries between content types
- Preserve archive organization principles

**Content Growth:**

- Anticipate new implementation details
- Plan for expanded alternative architecture research
- Consider additional reference materials
- Maintain consolidation principles

#### Maintenance Sustainability

**Process Improvement:**

- Regularly assess maintenance efficiency
- Refine guidelines based on experience
- Optimize for long-term sustainability
- Balance comprehensiveness with maintainability

**Tool Integration:**

- Consider automation for consistency checking
- Plan for integration with development workflows
- Optimize for version control efficiency
- Maintain human-readable structure

These guidelines ensure the documentation structure remains maintainable,
useful, and optimized for both human developers and AI agents while preserving
the benefits achieved through consolidation.
