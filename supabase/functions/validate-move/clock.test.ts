import { applyElapsedAndIncrement } from './clock.ts';
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';

Deno.test('applies elapsed and increment for red player move', () => {
  const result = applyElapsedAndIncrement({
    clocks: { red: 60_000, blue: 55_000 },
    playerColor: 'red',
    elapsedMs: 3_000,
    incrementSeconds: 2
  });

  assertEquals(result, { red: 59_000, blue: 55_000 });
});

Deno.test('applies elapsed and increment for blue player move', () => {
  const result = applyElapsedAndIncrement({
    clocks: { red: 60_000, blue: 55_000 },
    playerColor: 'blue',
    elapsedMs: 4_000,
    incrementSeconds: 1
  });

  assertEquals(result, { red: 60_000, blue: 52_000 });
});

Deno.test('clamps moving player clock at zero before increment', () => {
  const result = applyElapsedAndIncrement({
    clocks: { red: 800, blue: 1_000 },
    playerColor: 'red',
    elapsedMs: 2_500,
    incrementSeconds: 0
  });

  assertEquals(result, { red: 0, blue: 1_000 });
});

Deno.test('negative elapsed/increment are treated as zero', () => {
  const result = applyElapsedAndIncrement({
    clocks: { red: 10_000, blue: 10_000 },
    playerColor: 'blue',
    elapsedMs: -500,
    incrementSeconds: -2
  });

  assertEquals(result, { red: 10_000, blue: 10_000 });
});
