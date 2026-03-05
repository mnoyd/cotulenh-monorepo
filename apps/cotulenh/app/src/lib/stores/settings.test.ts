import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS, SettingsSchema } from './settings';

// Mock browser environment
vi.mock('$app/environment', () => ({ browser: true }));

describe('Settings', () => {
  it('DEFAULT_SETTINGS includes moveConfirmation as false', () => {
    expect(DEFAULT_SETTINGS.moveConfirmation).toBe(false);
  });

  it('SettingsSchema validates moveConfirmation boolean', () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, moveConfirmation: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moveConfirmation).toBe(true);
    }
  });

  it('SettingsSchema defaults moveConfirmation to false', () => {
    const { moveConfirmation: _, ...withoutMoveConfirm } = DEFAULT_SETTINGS;
    const result = SettingsSchema.safeParse(withoutMoveConfirm);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moveConfirmation).toBe(false);
    }
  });

  it('SettingsSchema rejects non-boolean moveConfirmation', () => {
    const result = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, moveConfirmation: 'yes' });
    expect(result.success).toBe(false);
  });
});
