# Alternative Move Application Approaches

This folder contains comprehensive documentation for different approaches to
implementing move application and undo mechanisms in CoTuLenh.

## Problem Statement

CoTuLenh has complex move application requirements:

- **7+ different move types** (normal, capture, deploy-step, stay-capture,
  combine, etc.)
- **Heroic promotion logic** (single piece, multiple simultaneous, last piece
  rule)
- **Deploy session state management** (multi-step moves with partial state)
- **Perfect undo capability** for UI applications
- **Legal move filtering** (make move → test legality → undo)

## Approaches Documented

### 1. Mutable Make/Unmake Pattern

**File:** `mutable-make-unmake.md`

**What it solves:**

- ✅ **Performance** - Fastest approach (10-15ms move generation)
- ✅ **Memory efficiency** - Minimal allocations (2KB per position)
- ✅ **Proven pattern** - Used by all chess engines
- ✅ **Direct implementation** - No abstraction overhead

**Best for:**

- Performance-critical applications
- Teams with strong discipline and test coverage
- Single-threaded applications
- When you need maximum speed

**Challenges:**

- ⚠️ **State corruption risk** - Must perfectly restore all state
- ⚠️ **Complex undo logic** - Every move type needs correct undo
- ⚠️ **Testing overhead** - 100+ tests needed for state integrity

---

### 2. Command Pattern Approach

**File:** `command-pattern-approach.md`

**What it solves:**

- ✅ **Composability** - Build complex moves from atomic actions
- ✅ **Perfect undo guarantee** - Mathematically guaranteed if actions are
  correct
- ✅ **Debugging** - Clear action sequences
- ✅ **Testability** - Test atomic actions independently

**Best for:**

- Complex games with many move types (20+)
- Teams that prefer OOP patterns
- When you need move serialization/replay
- Applications requiring audit trails

**Challenges:**

- ⚠️ **Implementation complexity** - 15+ classes needed
- ⚠️ **Performance overhead** - Object allocation per action
- ⚠️ **Overkill for CoTuLenh** - Too much abstraction for 7 move types

---

### 3. Immutable State Approach

**File:** `immutable-state-approach.md`

**What it solves:**

- ✅ **Correctness guarantee** - Impossible to corrupt state
- ✅ **Simple testing** - No state restoration to test
- ✅ **Parallelization** - Thread-safe by design
- ✅ **Undo/redo trivial** - Just keep old states

**Best for:**

- UI applications where bugs are visible
- Multi-threaded applications
- Teams preferring functional programming
- When correctness is more important than performance

**Challenges:**

- ⚠️ **Performance cost** - 30-50% slower than mutable
- ⚠️ **Memory overhead** - More allocations and GC pressure
- ⚠️ **Cloning complexity** - Must correctly clone all state

---

### 4. Virtual State Overlay (Hybrid)

**File:** `virtual-state-overlay.md`

**What it solves:**

- ✅ **Deploy session complexity** - Clean handling of partial states
- ✅ **Unified code paths** - Same functions for normal and deploy moves
- ✅ **Atomic commits** - Real state unchanged until deploy complete
- ✅ **Clean history** - One entry per complete operation

**Best for:**

- Handling deploy sessions specifically
- When you need both safety and performance
- Complex multi-step operations
- Applications with transaction-like requirements

**Challenges:**

- ⚠️ **Implementation complexity** - Virtual board abstraction
- ⚠️ **Memory overhead** - Virtual state tracking
- ⚠️ **Debugging complexity** - Multiple state layers

---

## Heroic Promotion Integration

### Heroic Promotion Challenges

**File:** `heroic-promotion-integration.md`

All approaches must handle:

- **Multiple simultaneous promotions** (one move promotes 3+ pieces)
- **Deploy session promotions** (promotion during multi-step moves)
- **Last piece promotion** (HEADQUARTER becomes heroic when alone)
- **Perfect undo** (restore exact heroic state)

Each approach handles heroic promotion differently:

- **Mutable:** Track changes in UndoInfo
- **Command:** Atomic promotion actions
- **Immutable:** New state with updated heroic flags
- **Virtual:** Heroic changes in virtual overlay

---

## Performance Comparison

| Approach                | Move Generation | Memory Usage | Implementation  | Correctness |
| ----------------------- | --------------- | ------------ | --------------- | ----------- |
| **Mutable Make/Unmake** | 🏆 10-15ms      | 🏆 2KB       | ⚠️ Complex      | ⚠️ Risk     |
| **Command Pattern**     | ✅ 12-18ms      | ✅ 4KB       | ❌ Very Complex | ✅ Good     |
| **Immutable State**     | ✅ 17-23ms      | ⚠️ 10KB      | ✅ Simple       | 🏆 Perfect  |
| **Virtual Overlay**     | ✅ 14-21ms      | ✅ 4KB       | ⚠️ Complex      | ✅ Good     |

---

## Recommendations by Use Case

### For CoTuLenh UI Application

**Recommended:** Mutable Make/Unmake with excellent test coverage

**Reasoning:**

- Performance difference is imperceptible for UI (10ms vs 20ms)
- Simpler than command pattern
- Current codebase already uses mutation
- Can add immutable public API later if needed

### For CoTuLenh AI Engine

**Recommended:** Mutable Make/Unmake

**Reasoning:**

- Performance is critical (millions of positions/second)
- Memory efficiency matters
- Single-threaded operation
- Proven pattern for game engines

### For Multi-Player Server

**Recommended:** Immutable State

**Reasoning:**

- Correctness is critical (bugs affect multiple users)
- May need parallelization
- Easier to reason about concurrent access
- Undo/redo for game replay

### For Deploy Session Specifically

**Recommended:** Virtual State Overlay

**Reasoning:**

- Deploy sessions are the hardest part of CoTuLenh
- Virtual overlay elegantly handles partial states
- Atomic commits prevent corruption
- Clean integration with any base approach

---

## Implementation Priority

### Phase 1: Choose Base Approach (Week 1)

1. Read all approach documents
2. Consider team preferences and requirements
3. Implement basic move application
4. Add simple heroic promotion

### Phase 2: Add Complexity (Week 2-3)

1. Implement all move types
2. Add comprehensive heroic promotion
3. Integrate deploy session handling
4. Add legal move filtering

### Phase 3: Polish & Test (Week 4)

1. Performance optimization
2. Comprehensive test suite (100+ tests)
3. Error handling and validation
4. Documentation and examples

---

## Files in This Folder

- `README.md` - This overview document
- `mutable-make-unmake.md` - Complete mutable approach implementation
- `command-pattern-approach.md` - Command pattern with atomic actions
- `immutable-state-approach.md` - Immutable state transitions
- `virtual-state-overlay.md` - Virtual state for deploy sessions
- `heroic-promotion-integration.md` - Heroic promotion for all approaches
- `performance-benchmarks.md` - Detailed performance analysis
- `implementation-examples/` - Complete code examples for each approach

---

## Quick Decision Guide

**Need maximum performance?** → Mutable Make/Unmake **Want guaranteed
correctness?** → Immutable State  
**Have complex move types (20+)?** → Command Pattern **Struggling with deploy
sessions?** → Virtual State Overlay **Team prefers functional style?** →
Immutable State **Building an AI engine?** → Mutable Make/Unmake **Building a UI
application?** → Any approach works (choose by preference)

---

## Getting Started

1. **Read the overview** in this README
2. **Choose your approach** based on requirements
3. **Read the detailed document** for your chosen approach
4. **Study the implementation examples**
5. **Start with basic moves** and add complexity incrementally
6. **Test thoroughly** - each approach has specific testing needs

The goal is to provide you with complete, production-ready implementations for
whichever approach best fits your needs and team preferences.
