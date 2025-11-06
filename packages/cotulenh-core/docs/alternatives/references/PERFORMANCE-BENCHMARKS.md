# Performance Benchmarking Templates and Methodologies

## Comprehensive Performance Testing Framework for CoTuLenh Architectures

### Overview

This document provides standardized benchmarking templates and methodologies for
comparing different architectural approaches to CoTuLenh implementation. It
includes test scenarios, measurement techniques, and analysis frameworks.

### Benchmarking Methodology

#### Test Environment Standardization

```typescript
// Standard test environment configuration
interface BenchmarkEnvironment {
  hardware: {
    cpu: string // "Intel i7-9700K @ 3.6GHz"
    memory: string // "32GB DDR4-3200"
    storage: string // "NVMe SSD"
    cache: {
      l1: string // "32KB I + 32KB D"
      l2: string // "256KB"
      l3: string // "12MB"
    }
  }
  software: {
    os: string // "Ubuntu 22.04 LTS"
    runtime: string // "Node.js 18.17.0"
    compiler: string // "V8 11.3.244.8"
    flags: string[] // ["--optimize-for-size", "--max-old-space-size=4096"]
  }
  conditions: {
    temperature: number // CPU temperature during test
    load: number // System load average
    isolated: boolean // Whether test ran in isolation
  }
}
```

#### Benchmark Categories

1. **Micro-benchmarks**: Individual function performance
2. **Component benchmarks**: Subsystem performance
3. **Integration benchmarks**: Full system performance
4. **Stress benchmarks**: Performance under load
5. **Memory benchmarks**: Allocation and usage patterns

### Core Performance Test Suite

#### 1. Move Generation Benchmarks

```typescript
// Move generation performance test template
class MoveGenerationBenchmark {
  private positions: string[] = [
    // Starting position
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',

    // Mid-game with stacks
    'r(nf)bqkb(nt)r/pppppppp/8/8/8/8/PPPPPPPP/R(NF)BQKB(NT)R w - - 0 1',

    // Complex position with heroic pieces
    'r+n+bqkb+n+r/pppppppp/8/8/8/8/PPPPPPPP/R+N+BQKB+N+R w - - 0 1',

    // Endgame position
    '8/8/8/3k4/8/3K4/8/8 w - - 0 1',

    // Air defense heavy position
    '8/8/3aa3/8/3AA3/8/8/8 w - - 0 1',
  ]

  async benchmarkMoveGeneration(
    implementation: CoTulenhImplementation,
  ): Promise<BenchmarkResult> {
    const results: PerformanceResult[] = []

    for (const position of this.positions) {
      const game = new implementation(position)

      // Warm up
      for (let i = 0; i < 100; i++) {
        game.moves()
      }

      // Actual benchmark
      const startTime = performance.now()
      const startMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < 10000; i++) {
        const moves = game.moves()
      }

      const endTime = performance.now()
      const endMemory = process.memoryUsage().heapUsed

      results.push({
        position,
        timeMs: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        movesPerSecond: 10000 / ((endTime - startTime) / 1000),
        moveCount: game.moves().length,
      })
    }

    return this.analyzeResults(results)
  }
}
```

#### 2. Stack Operation Benchmarks

```typescript
// Stack system performance test template
class StackOperationBenchmark {
  private stackScenarios = [
    {
      name: 'Simple Stack Creation',
      setup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',
      operation: (game) => game.combineStack('a1', ['r', 'n']),
    },
    {
      name: 'Complex Stack Deploy',
      setup:
        'r(nft)bqkb(nt)r/pppppppp/8/8/8/8/PPPPPPPP/R(NFT)BQKB(NT)R w - - 0 1',
      operation: (game) => game.move('Ra8-a7(NF)'),
    },
    {
      name: 'Stack Recombination',
      setup:
        'r(nf)1qkb(nt)r/pppppppp/8/8/8/8/PPPPPPPP/R(NF)1QKB(NT)R w - - 0 1',
      operation: (game) => game.move('Ra8+b8'),
    },
  ]

  async benchmarkStackOperations(
    implementation: CoTulenhImplementation,
  ): Promise<BenchmarkResult> {
    const results = []

    for (const scenario of this.stackScenarios) {
      const game = new implementation(scenario.setup)

      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        const gameCopy = game.clone()
        scenario.operation(gameCopy)
      }

      const endTime = performance.now()

      results.push({
        scenario: scenario.name,
        timeMs: endTime - startTime,
        operationsPerSecond: 1000 / ((endTime - startTime) / 1000),
      })
    }

    return results
  }
}
```

#### 3. Air Defense Zone Benchmarks

```typescript
// Air defense system performance test template
class AirDefenseBenchmark {
  private airDefensePositions = [
    // Single air defense
    '8/8/8/3aa3/8/8/8/8 w - - 0 1',

    // Multiple overlapping zones
    '8/2aa4/8/aa4aa/8/4aa2/8/8 w - - 0 1',

    // Complex air defense network
    'aa6/2aa4/8/aa4aa/8/4aa2/6aa/8 w - - 0 1',
  ]

  async benchmarkAirDefenseCalculations(
    implementation: CoTulenhImplementation,
  ): Promise<BenchmarkResult> {
    const results = []

    for (const position of this.airDefensePositions) {
      const game = new implementation(position)

      // Test zone calculation performance
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        // Calculate air defense zones for all squares
        for (let rank = 1; rank <= 12; rank++) {
          for (let file = 1; file <= 11; file++) {
            const square = `${String.fromCharCode(96 + file)}${rank}`
            game.getAirDefenseLevel(square)
          }
        }
      }

      const endTime = performance.now()

      results.push({
        position,
        timeMs: endTime - startTime,
        calculationsPerSecond: (1000 * 132) / ((endTime - startTime) / 1000), // 132 squares
      })
    }

    return results
  }
}
```

#### 4. Memory Usage Benchmarks

```typescript
// Memory usage analysis template
class MemoryBenchmark {
  async benchmarkMemoryUsage(
    implementation: CoTulenhImplementation,
  ): Promise<MemoryBenchmarkResult> {
    const results = {
      positionSize: 0,
      moveListSize: 0,
      historySize: 0,
      cacheSize: 0,
      totalSize: 0,
      allocationRate: 0,
      gcPressure: 0,
    }

    // Measure position size
    const game = new implementation()
    const beforePosition = process.memoryUsage().heapUsed
    const positions = []

    for (let i = 0; i < 1000; i++) {
      positions.push(new implementation())
    }

    const afterPosition = process.memoryUsage().heapUsed
    results.positionSize = (afterPosition - beforePosition) / 1000

    // Measure move list size
    const beforeMoves = process.memoryUsage().heapUsed
    const moveLists = []

    for (let i = 0; i < 1000; i++) {
      moveLists.push(game.moves({ verbose: true }))
    }

    const afterMoves = process.memoryUsage().heapUsed
    results.moveListSize = (afterMoves - beforeMoves) / 1000

    // Measure allocation rate
    const startTime = Date.now()
    const startMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < 10000; i++) {
      const tempGame = new implementation()
      tempGame.moves()
    }

    const endTime = Date.now()
    const endMemory = process.memoryUsage().heapUsed

    results.allocationRate = (endMemory - startMemory) / (endTime - startTime) // bytes per ms

    return results
  }
}
```

### Comparative Analysis Framework

#### Performance Comparison Template

```typescript
interface PerformanceComparison {
  architectures: string[]
  metrics: {
    moveGeneration: {
      [architecture: string]: {
        movesPerSecond: number
        memoryPerMove: number
        latency: number
      }
    }
    stackOperations: {
      [architecture: string]: {
        operationsPerSecond: number
        memoryOverhead: number
      }
    }
    airDefense: {
      [architecture: string]: {
        calculationsPerSecond: number
        accuracy: number
      }
    }
    memory: {
      [architecture: string]: {
        positionSize: number
        allocationRate: number
        gcPressure: number
      }
    }
  }
  analysis: {
    winner: {
      [metric: string]: string
    }
    tradeoffs: {
      [architecture: string]: {
        strengths: string[]
        weaknesses: string[]
      }
    }
  }
}
```

#### Statistical Analysis Tools

```typescript
class BenchmarkAnalyzer {
  calculateStatistics(measurements: number[]): Statistics {
    const sorted = measurements.sort((a, b) => a - b)
    const n = measurements.length

    return {
      mean: measurements.reduce((a, b) => a + b) / n,
      median:
        n % 2 === 0
          ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
          : sorted[Math.floor(n / 2)],
      min: sorted[0],
      max: sorted[n - 1],
      stdDev: Math.sqrt(
        measurements.reduce((sum, x) => sum + Math.pow(x - this.mean, 2), 0) /
          n,
      ),
      percentile95: sorted[Math.floor(n * 0.95)],
      percentile99: sorted[Math.floor(n * 0.99)],
    }
  }

  compareArchitectures(
    results: ArchitectureBenchmarkResults[],
  ): ComparisonReport {
    const report = {
      summary: {},
      detailed: {},
      recommendations: [],
    }

    // Calculate relative performance
    for (const metric of [
      'moveGeneration',
      'stackOperations',
      'airDefense',
      'memory',
    ]) {
      const baseline = results[0][metric] // Use first architecture as baseline

      report.summary[metric] = results.map((result) => ({
        architecture: result.architecture,
        relativePerformance: result[metric] / baseline,
        improvement:
          (((result[metric] - baseline) / baseline) * 100).toFixed(1) + '%',
      }))
    }

    return report
  }
}
```

### Specialized Benchmarks

#### 1. CoTuLenh-Specific Scenarios

```typescript
// CoTuLenh-specific performance scenarios
const COTULENH_SCENARIOS = [
  {
    name: 'Heavy Stack Deploy',
    description: 'Deploy from 4-piece stack with terrain restrictions',
    fen: 'r(nfta)bqkb(nfta)r/pppppppp/8/8/8/8/PPPPPPPP/R(NFTA)BQKB(NFTA)R w - - 0 1',
    operations: ['Ra8-a7(NF)', 'Ra8-b8(TA)', 'Ra8-a7(N)', 'Ra8-b7(FTA)'],
  },
  {
    name: 'Heroic Cascade',
    description: 'Multiple heroic promotions in sequence',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',
    operations: ['Qd1xd8+', 'Nf3xe5+', 'Ta1xc8+'], // Each triggers heroic
  },
  {
    name: 'Air Defense Gauntlet',
    description: 'Air Force movement through complex defense network',
    fen: 'f7/2aa4/8/aa4aa/8/4aa2/6f1/8 w - - 0 1',
    operations: ['Fa8-h8', 'Fg1-a7', 'Fa8-g1'], // Navigate through zones
  },
]
```

#### 2. Stress Testing Framework

```typescript
class StressBenchmark {
  async stressTestMoveGeneration(
    implementation: CoTulenhImplementation,
    duration: number,
  ): Promise<StressResult> {
    const startTime = Date.now()
    let iterations = 0
    let errors = 0
    let maxMemory = 0

    while (Date.now() - startTime < duration) {
      try {
        const game = new implementation()

        // Play random game
        for (let moves = 0; moves < 100; moves++) {
          const legalMoves = game.moves()
          if (legalMoves.length === 0) break

          const randomMove =
            legalMoves[Math.floor(Math.random() * legalMoves.length)]
          game.move(randomMove)
        }

        iterations++
        maxMemory = Math.max(maxMemory, process.memoryUsage().heapUsed)
      } catch (error) {
        errors++
      }
    }

    return {
      duration,
      iterations,
      errors,
      errorRate: errors / iterations,
      iterationsPerSecond: iterations / (duration / 1000),
      maxMemoryUsage: maxMemory,
      stability:
        errors === 0
          ? 'Stable'
          : errors < iterations * 0.01
            ? 'Mostly Stable'
            : 'Unstable',
    }
  }
}
```

### Benchmarking Best Practices

#### 1. Environment Control

```bash
# System preparation script
#!/bin/bash

# Disable CPU frequency scaling
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Disable swap
sudo swapoff -a

# Set CPU affinity
taskset -c 0-3 node benchmark.js

# Monitor system during test
iostat -x 1 &
vmstat 1 &
```

#### 2. Statistical Significance

```typescript
// Ensure statistical significance
class BenchmarkRunner {
  async runWithSignificance(
    benchmark: () => Promise<number>,
    targetConfidence: number = 0.95,
    maxIterations: number = 1000,
  ): Promise<StatisticalResult> {
    const measurements: number[] = []
    let iterations = 0

    do {
      measurements.push(await benchmark())
      iterations++

      if (iterations >= 30) {
        // Minimum sample size
        const stats = this.calculateStatistics(measurements)
        const marginOfError = 1.96 * (stats.stdDev / Math.sqrt(iterations))
        const confidence = 1 - marginOfError / stats.mean

        if (confidence >= targetConfidence) {
          return {
            result: stats.mean,
            confidence,
            iterations,
            marginOfError,
          }
        }
      }
    } while (iterations < maxIterations)

    throw new Error('Could not achieve target confidence level')
  }
}
```

#### 3. Regression Detection

```typescript
// Performance regression detection
class RegressionDetector {
  detectRegression(
    baseline: BenchmarkResult,
    current: BenchmarkResult,
    threshold: number = 0.05, // 5% regression threshold
  ): RegressionReport {
    const regressions = []

    for (const metric in baseline.metrics) {
      const baselineValue = baseline.metrics[metric]
      const currentValue = current.metrics[metric]
      const change = (currentValue - baselineValue) / baselineValue

      if (change < -threshold) {
        // Performance degraded
        regressions.push({
          metric,
          baselineValue,
          currentValue,
          change: change * 100,
          severity:
            change < -0.2 ? 'Critical' : change < -0.1 ? 'Major' : 'Minor',
        })
      }
    }

    return {
      hasRegressions: regressions.length > 0,
      regressions,
      summary:
        regressions.length === 0
          ? 'No performance regressions detected'
          : `${regressions.length} performance regressions detected`,
    }
  }
}
```

### Reporting Templates

#### 1. Executive Summary Template

```markdown
# Performance Benchmark Report

## Executive Summary

**Test Date**: {date} **Architectures Tested**: {architectures} **Test
Duration**: {duration}

### Key Findings

- **Fastest Architecture**: {winner} ({improvement}% faster than baseline)
- **Most Memory Efficient**: {memory_winner} ({memory_improvement}% less memory)
- **Best Overall**: {overall_winner}

### Recommendations

1. For performance-critical applications: Use {performance_recommendation}
2. For memory-constrained environments: Use {memory_recommendation}
3. For balanced requirements: Use {balanced_recommendation}
```

#### 2. Detailed Analysis Template

```typescript
interface DetailedReport {
  metadata: {
    testDate: string
    environment: BenchmarkEnvironment
    architectures: string[]
    testDuration: number
  }
  results: {
    [architecture: string]: {
      moveGeneration: PerformanceMetrics
      stackOperations: PerformanceMetrics
      airDefense: PerformanceMetrics
      memory: MemoryMetrics
      stability: StabilityMetrics
    }
  }
  analysis: {
    relativePerformance: ComparisonMatrix
    tradeoffAnalysis: TradeoffMatrix
    recommendations: Recommendation[]
  }
  appendix: {
    rawData: RawBenchmarkData
    methodology: string
    limitations: string[]
  }
}
```

### Continuous Performance Monitoring

#### 1. CI/CD Integration

```yaml
# GitHub Actions performance monitoring
name: Performance Benchmark
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run Benchmarks
        run: npm run benchmark
      - name: Compare with Baseline
        run: npm run benchmark:compare
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./benchmark-results.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Impact\n\n${results.summary}`
            });
```

#### 2. Performance Dashboard

```typescript
// Performance monitoring dashboard
class PerformanceDashboard {
  generateDashboard(historicalData: BenchmarkResult[]): Dashboard {
    return {
      charts: {
        performanceTrend: this.generateTrendChart(historicalData),
        memoryUsage: this.generateMemoryChart(historicalData),
        regressionAlerts: this.generateAlerts(historicalData),
      },
      metrics: {
        currentPerformance: historicalData[historicalData.length - 1],
        performanceChange: this.calculateChange(historicalData),
        stability: this.calculateStability(historicalData),
      },
      alerts: this.generateAlerts(historicalData),
    }
  }
}
```

### References

- **Architecture Comparison**: See ARCHITECTURE-COMPARISON.md
- **Implementation Complexity**: See IMPLEMENTATION-COMPLEXITY.md
- **Migration Planning**: See MIGRATION-TEMPLATES.md
- **Bitboard Performance**: See ../bitboard/BITBOARD-PERFORMANCE-ANALYSIS.md
