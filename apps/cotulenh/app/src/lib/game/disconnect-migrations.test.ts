import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const disconnectMigrationPath = resolve(
  process.cwd(),
  '../../..',
  'supabase/migrations/018_game_states_disconnect_tracking.sql'
);
const cronMigrationPath = resolve(
  process.cwd(),
  '../../..',
  'supabase/migrations/019_disconnect_forfeit_cron.sql'
);

describe('disconnect migration contract', () => {
  it('adds disconnect tracking columns and extends the lock RPC', () => {
    const source = readFileSync(disconnectMigrationPath, 'utf8');
    expect(source).toContain('ADD COLUMN disconnect_red_at timestamptz DEFAULT NULL,');
    expect(source).toContain('ADD COLUMN disconnect_blue_at timestamptz DEFAULT NULL,');
    expect(source).toContain('ADD COLUMN clocks_paused boolean NOT NULL DEFAULT false;');
    expect(source).toMatch(
      /CREATE OR REPLACE FUNCTION public\.lock_game_state_for_update\(p_game_id uuid\)[\s\S]*disconnect_red_at timestamptz[\s\S]*disconnect_blue_at timestamptz[\s\S]*clocks_paused boolean/
    );
  });

  it('records disconnects once per side and freezes clocks', () => {
    const source = readFileSync(disconnectMigrationPath, 'utf8');
    expect(source).toMatch(
      /CREATE OR REPLACE FUNCTION public\.record_player_disconnect\([\s\S]*WHEN p_color = 'red' AND disconnect_red_at IS NULL THEN v_now[\s\S]*WHEN p_color = 'blue' AND disconnect_blue_at IS NULL THEN v_now[\s\S]*clocks_paused = true/
    );
    expect(source).toContain("RAISE EXCEPTION 'Game not found or not started'");
  });

  it('clears one disconnect marker at a time and only resumes clocks when both sides are back', () => {
    const source = readFileSync(disconnectMigrationPath, 'utf8');
    expect(source).toMatch(
      /CREATE OR REPLACE FUNCTION public\.clear_player_disconnect\([\s\S]*disconnect_red_at = CASE WHEN p_color = 'red' THEN NULL ELSE disconnect_red_at END,[\s\S]*disconnect_blue_at = CASE WHEN p_color = 'blue' THEN NULL ELSE disconnect_blue_at END,[\s\S]*clocks_paused = CASE[\s\S]*WHEN p_color = 'red' THEN disconnect_blue_at IS NOT NULL[\s\S]*ELSE disconnect_red_at IS NOT NULL/
    );
  });

  it('encodes timeout windows, started-game filtering, and simultaneous-disconnect arbitration', () => {
    const source = readFileSync(disconnectMigrationPath, 'utf8');
    expect(source).toMatch(
      /CREATE OR REPLACE FUNCTION public\.forfeit_disconnected_games\(\)[\s\S]*WHERE g\.status = 'started'[\s\S]*interval '60 seconds'[\s\S]*abs\(extract\(epoch from \(r\.disconnect_red_at - r\.disconnect_blue_at\)\)\) <= 1[\s\S]*v_status := 'aborted'[\s\S]*v_winner := NULL;[\s\S]*v_status := 'timeout'[\s\S]*v_winner := 'blue'[\s\S]*v_winner := 'red'/
    );
    expect(source).toContain(
      "result_reason = CASE WHEN v_status = 'timeout' THEN 'disconnect_forfeit' ELSE 'simultaneous_disconnect' END"
    );
  });

  it('restricts new disconnect RPC execution to service_role', () => {
    const source = readFileSync(disconnectMigrationPath, 'utf8');
    for (const target of [
      'record_player_disconnect(uuid, text)',
      'clear_player_disconnect(uuid, text)',
      'forfeit_disconnected_games()'
    ]) {
      expect(source).toContain(`REVOKE ALL ON FUNCTION public.${target} FROM PUBLIC;`);
      expect(source).toContain(`GRANT EXECUTE ON FUNCTION public.${target} TO service_role;`);
    }
  });
});

describe('disconnect cron migration contract', () => {
  it('schedules the forfeit job every 15 seconds through pg_cron', () => {
    const source = readFileSync(cronMigrationPath, 'utf8');
    expect(source).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron;');
    expect(source).toMatch(
      /SELECT cron\.schedule\([\s\S]*'forfeit-disconnected-games'[\s\S]*'15 seconds'[\s\S]*SELECT public\.forfeit_disconnected_games\(\);/
    );
  });
});
