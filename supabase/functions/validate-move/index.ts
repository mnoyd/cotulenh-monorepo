import { CoTuLenh } from '@cotulenh/core';

Deno.serve(async (req) => {
  try {
    const game = new CoTuLenh();
    const result = game.move('c5-c6');
    return new Response(
      JSON.stringify({
        success: result !== null,
        move: result?.san ?? null,
        message: 'Edge Function works — @cotulenh/core is Deno-compatible'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
