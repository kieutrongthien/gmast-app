import { describe, it, expect, beforeEach, vi } from 'vitest';

const storage = new Map<string, string>();

const getMock = vi.fn(async ({ key }: { key: string }) => ({ value: storage.get(key) ?? null }));
const setMock = vi.fn(async ({ key, value }: { key: string; value: string }) => {
  storage.set(key, value);
});
const removeMock = vi.fn(async ({ key }: { key: string }) => {
  storage.delete(key);
});

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: getMock,
    set: setMock,
    remove: removeMock
  }
}));

describe('sendConfigService', () => {
  beforeEach(() => {
    storage.clear();
    getMock.mockClear();
    setMock.mockClear();
    removeMock.mockClear();
    vi.resetModules();
  });

  it('returns default config when none stored', async () => {
    const { getSendConfig } = await import('@/services/messages/sendConfigService');
    const config = await getSendConfig();
    expect(config).toEqual({ simMode: 'random', simSlotId: null });
  });

  it('saves and retrieves preferences', async () => {
    const { saveSendConfig, getSendConfig } = await import('@/services/messages/sendConfigService');
    await saveSendConfig({ simMode: 'manual', simSlotId: 'slot-1' });
    const config = await getSendConfig();
    expect(config).toEqual({ simMode: 'manual', simSlotId: 'slot-1' });
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('merges updates when calling updateSendConfig', async () => {
    const { updateSendConfig, getSendConfig } = await import('@/services/messages/sendConfigService');
    await updateSendConfig({ simMode: 'manual' });
    await updateSendConfig({ simSlotId: 'slot-2' });
    const config = await getSendConfig();
    expect(config).toEqual({ simMode: 'manual', simSlotId: 'slot-2' });
  });

  it('resets preferences', async () => {
    const { saveSendConfig, resetSendConfig, getSendConfig } = await import('@/services/messages/sendConfigService');
    await saveSendConfig({ simMode: 'manual', simSlotId: 'slot-9' });
    await resetSendConfig();
    const config = await getSendConfig();
    expect(config).toEqual({ simMode: 'random', simSlotId: null });
    expect(removeMock).toHaveBeenCalledTimes(1);
  });
});
