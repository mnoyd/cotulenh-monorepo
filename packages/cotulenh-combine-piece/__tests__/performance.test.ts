import { describe, it, expect } from 'vitest';
import { CombinePieceFactory, PieceCombiner, Piece } from '../src/index.js';

// Test piece interface
interface BenchmarkPiece extends Piece {
  id: string;
  role: string;
  color: string;
  carrying?: BenchmarkPiece[];
}

// Helper functions
const createPiece = (role: string, id: string, color: string = 'red'): BenchmarkPiece => ({
  id,
  role,
  color
});

const createStackedPiece = (
  carrierRole: string,
  carriedRoles: string[],
  id: string,
  color: string = 'red'
): BenchmarkPiece => ({
  id,
  role: carrierRole,
  color,
  carrying: carriedRoles.map((role, i) => createPiece(role, `${id}_${i}`, color))
});

// Performance measurement utility
function measurePerformance(name: string, fn: () => void, iterations: number = 10000): number {
  // Warm up
  for (let i = 0; i < 100; i++) {
    fn();
  }

  // Measure
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(
    `${name}: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg (${iterations} iterations)`
  );
  return avgTime;
}

function comparePerformance(
  testName: string,
  originalFn: () => void,
  alternativeFn: () => void,
  iterations: number = 10000
): { improvement: number; speedup: number } {
  console.log(`\n=== ${testName} ===`);

  const originalTime = measurePerformance('Original', originalFn, iterations);
  const alternativeTime = measurePerformance('Alternative', alternativeFn, iterations);

  const improvement = ((originalTime - alternativeTime) / originalTime) * 100;
  const speedup = originalTime / alternativeTime;

  console.log(
    `Improvement: ${improvement.toFixed(2)}% (${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'})`
  );

  return { improvement, speedup };
}

describe('Performance Comparison Tests', () => {
  const originalFactory = new CombinePieceFactory<BenchmarkPiece>((piece) => piece.role);
  const alternativeCombiner = new PieceCombiner<BenchmarkPiece>((piece) => piece.role);

  it('should measure simple combination performance', () => {
    const tank = createPiece('tank', 'tank1');
    const infantry = createPiece('infantry', 'inf1');

    const result = comparePerformance(
      'Simple Tank + Infantry',
      () => originalFactory.formStack(tank, infantry),
      () => alternativeCombiner.combine(tank, infantry),
      50000
    );

    // Expect reasonable performance (not more than 50% slower)
    expect(result.speedup).toBeGreaterThan(0.5);
  });

  it('should measure complex combination performance', () => {
    const navy = createPiece('navy', 'navy1');
    const airforceWithTank = createStackedPiece('air_force', ['tank'], 'af1');

    const result = comparePerformance(
      'Complex Navy + (Airforce + Tank)',
      () => originalFactory.formStack(navy, airforceWithTank),
      () => alternativeCombiner.combine(navy, airforceWithTank),
      20000
    );

    expect(result.speedup).toBeGreaterThan(0.3);
  });

  it('should measure failed combination performance', () => {
    const tank = createPiece('tank', 'tank1');
    const artillery = createPiece('artillery', 'art1');

    const result = comparePerformance(
      'Failed Tank + Artillery',
      () => originalFactory.formStack(tank, artillery),
      () => alternativeCombiner.combine(tank, artillery),
      50000
    );

    // Failed combinations should be fast in both implementations
    expect(result.speedup).toBeGreaterThan(0.2);
  });

  it('should measure carrier hierarchy resolution performance', () => {
    const navy = createPiece('navy', 'navy1');
    const airforce = createPiece('air_force', 'af1');

    const result = comparePerformance(
      'Carrier Hierarchy Navy + Airforce',
      () => originalFactory.formStack(navy, airforce),
      () => alternativeCombiner.combine(navy, airforce),
      30000
    );

    expect(result.speedup).toBeGreaterThan(0.3);
  });

  it('should measure multiple piece combination performance', () => {
    const pieces = [
      createPiece('navy', 'navy1'),
      createPiece('air_force', 'af1'),
      createPiece('tank', 'tank1'),
      createPiece('infantry', 'inf1')
    ];

    const result = comparePerformance(
      'Multiple Pieces (Navy + Airforce + Tank + Infantry)',
      () => originalFactory.createCombineStackFromPieces(pieces),
      () => alternativeCombiner.combineMultiple(pieces),
      10000
    );

    expect(result.speedup).toBeGreaterThan(0.2);
  });

  it('should measure deep stack flattening performance', () => {
    const deepStack = createPiece('navy', 'navy1');
    deepStack.carrying = [
      {
        ...createPiece('air_force', 'af1'),
        carrying: [
          {
            ...createPiece('tank', 'tank1'),
            carrying: [createPiece('infantry', 'inf1')]
          }
        ]
      }
    ];

    const engineer = createStackedPiece('engineer', ['artillery'], 'eng1');

    const result = comparePerformance(
      'Deep Stack Flattening',
      () => originalFactory.formStack(deepStack, engineer),
      () => alternativeCombiner.combine(deepStack, engineer),
      10000
    );

    expect(result.speedup).toBeGreaterThan(0.2);
  });

  it('should measure large piece collection performance', () => {
    const largePieceSet = [
      createPiece('navy', 'navy1'),
      createPiece('air_force', 'af1'),
      createPiece('tank', 'tank1'),
      createPiece('tank', 'tank2'),
      createPiece('infantry', 'inf1'),
      createPiece('infantry', 'inf2'),
      createPiece('commander', 'cmd1'),
      createPiece('engineer', 'eng1'),
      createPiece('artillery', 'art1'),
      createPiece('anti_air', 'aa1')
    ];

    const result = comparePerformance(
      'Large Piece Collection (10 pieces)',
      () => originalFactory.createCombineStackFromPieces(largePieceSet),
      () => alternativeCombiner.combineMultiple(largePieceSet),
      5000
    );

    expect(result.speedup).toBeGreaterThan(0.1);
  });

  it('should measure error handling overhead', () => {
    const incompatiblePairs = [
      [createPiece('tank', 't1'), createPiece('artillery', 'a1')],
      [createPiece('engineer', 'e1'), createPiece('commander', 'c1')],
      [createPiece('headquarter', 'h1'), createPiece('infantry', 'i1')],
      [createPiece('tank', 't1'), createPiece('engineer', 'e1')]
    ];

    console.log('\n=== Error Handling Performance ===');

    let originalTotal = 0;
    let alternativeTotal = 0;

    incompatiblePairs.forEach(([piece1, piece2], index) => {
      const originalTime = measurePerformance(
        `Original Error ${index + 1}`,
        () => originalFactory.formStack(piece1, piece2),
        10000
      );

      const alternativeTime = measurePerformance(
        `Alternative Error ${index + 1}`,
        () => alternativeCombiner.combine(piece1, piece2),
        10000
      );

      originalTotal += originalTime;
      alternativeTotal += alternativeTime;
    });

    const improvement = ((originalTotal - alternativeTotal) / originalTotal) * 100;
    console.log(`\nTotal Error Handling Improvement: ${improvement.toFixed(2)}%`);

    // Error handling should not be significantly slower
    expect(alternativeTotal / originalTotal).toBeLessThan(3.0); // At most 3x slower
  });

  it('should measure rule lookup performance', () => {
    const pieceTypes = [
      'navy',
      'air_force',
      'tank',
      'engineer',
      'headquarter',
      'commander',
      'infantry',
      'militia',
      'artillery',
      'anti_air',
      'missile'
    ];

    const pieces = pieceTypes.map((type) => createPiece(type, `${type}1`));
    const testPiece = createPiece('infantry', 'test');

    const result = comparePerformance(
      'Rule Lookup (11 different piece types)',
      () => {
        pieces.forEach((piece) => {
          originalFactory.formStack(testPiece, piece);
        });
      },
      () => {
        pieces.forEach((piece) => {
          alternativeCombiner.combine(testPiece, piece);
        });
      },
      5000
    );

    expect(result.speedup).toBeGreaterThan(0.2);
  });

  it('should test memory allocation patterns', () => {
    const tank = createPiece('tank', 'tank1');
    const infantry = createPiece('infantry', 'inf1');
    const iterations = 1000;

    console.log('\n=== Memory Allocation Patterns ===');

    // Original approach
    const originalStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const result = originalFactory.formStack(tank, infantry);
      if (result && result.carrying) {
        const _ = result.carrying.length;
      }
    }
    const originalEnd = performance.now();

    // Alternative approach
    const alternativeStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const result = alternativeCombiner.combine(tank, infantry);
      if (result.success && result.result && result.result.carrying) {
        const _ = result.result.carrying.length;
      }
    }
    const alternativeEnd = performance.now();

    const originalTime = originalEnd - originalStart;
    const alternativeTime = alternativeEnd - alternativeStart;
    const improvement = ((originalTime - alternativeTime) / originalTime) * 100;

    console.log(`Original: ${originalTime.toFixed(2)}ms`);
    console.log(`Alternative: ${alternativeTime.toFixed(2)}ms`);
    console.log(`Improvement: ${improvement.toFixed(2)}%`);

    // Memory allocation should not be significantly worse
    expect(alternativeTime / originalTime).toBeLessThan(2.0);
  });

  it('should run stress test', () => {
    console.log('\n=== Stress Test ===');

    const roles = ['navy', 'air_force', 'tank', 'engineer', 'infantry', 'artillery', 'commander'];
    const testCount = 1000;

    // Generate test data
    const testPairs = Array.from({ length: testCount }, (_, i) => {
      const role1 = roles[Math.floor(Math.random() * roles.length)];
      const role2 = roles[Math.floor(Math.random() * roles.length)];
      return [createPiece(role1, `p1_${i}`), createPiece(role2, `p2_${i}`)];
    });

    // Test original implementation
    const originalStart = performance.now();
    let originalSuccess = 0;
    testPairs.forEach(([piece1, piece2]) => {
      const result = originalFactory.formStack(piece1, piece2);
      if (result) originalSuccess++;
    });
    const originalEnd = performance.now();

    // Test alternative implementation
    const alternativeStart = performance.now();
    let alternativeSuccess = 0;
    testPairs.forEach(([piece1, piece2]) => {
      const result = alternativeCombiner.combine(piece1, piece2);
      if (result.success) alternativeSuccess++;
    });
    const alternativeEnd = performance.now();

    const originalTime = originalEnd - originalStart;
    const alternativeTime = alternativeEnd - alternativeStart;
    const improvement = ((originalTime - alternativeTime) / originalTime) * 100;

    console.log(`Original: ${originalTime.toFixed(2)}ms (${originalSuccess} successes)`);
    console.log(`Alternative: ${alternativeTime.toFixed(2)}ms (${alternativeSuccess} successes)`);
    console.log(`Improvement: ${improvement.toFixed(2)}%`);

    // Both should have same success rate
    expect(originalSuccess).toBe(alternativeSuccess);

    // Performance should be reasonable
    expect(alternativeTime / originalTime).toBeLessThan(3.0);
  });

  it('should provide performance summary', () => {
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ All performance tests completed');
    console.log('📊 Alternative implementation provides:');
    console.log('   • Detailed error messages (vs null returns)');
    console.log('   • Better debugging capabilities');
    console.log('   • Cleaner, more maintainable code');
    console.log('   • Extensible rule system');
    console.log('   • Competitive performance');
    console.log('='.repeat(60));

    // This test always passes - it's just for summary
    expect(true).toBe(true);
  });
});
