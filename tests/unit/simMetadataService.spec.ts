import { beforeEach, describe, expect, it, vi } from 'vitest';

const platformRef = { current: 'android' as 'android' | 'ios' | 'web' | 'unknown' };
const pluginAvailableRef = { current: true };

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platformRef.current,
    isPluginAvailable: vi.fn(() => pluginAvailableRef.current)
  }
}));

vi.mock('@capgo/capacitor-sim', () => ({
  Sim: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getSimCards: vi.fn(),
    getPluginVersion: vi.fn()
  }
}));

import { Sim } from '@capgo/capacitor-sim';
import { readSimInventory } from '@/services/sim';

const simMock = vi.mocked(Sim, true);

describe('readSimInventory', () => {
  beforeEach(() => {
    simMock.checkPermissions.mockReset();
    simMock.requestPermissions.mockReset();
    simMock.getSimCards.mockReset();
    simMock.getPluginVersion.mockReset();
    platformRef.current = 'android';
    pluginAvailableRef.current = true;
  });

  it('returns unsupported snapshot on web', async () => {
    platformRef.current = 'web';
    pluginAvailableRef.current = false;

    const snapshot = await readSimInventory();

    expect(snapshot.status).toBe('unsupported');
    expect(snapshot.permission).toBe('denied');
    expect(snapshot.reason).toBe('unsupported-platform');
    expect(simMock.checkPermissions).not.toHaveBeenCalled();
  });

  it('respects requestPermission=false when access is denied', async () => {
    simMock.checkPermissions.mockResolvedValue({ readSimCard: 'denied' });

    const snapshot = await readSimInventory({ requestPermission: false });

    expect(snapshot.status).toBe('permission-denied');
    expect(snapshot.permission).toBe('denied');
    expect(snapshot.reason).toBe('readSimCard-denied');
    expect(simMock.requestPermissions).not.toHaveBeenCalled();
  });

  it('normalizes returned SIM cards once permission is granted', async () => {
    simMock.checkPermissions.mockResolvedValueOnce({ readSimCard: 'prompt' });
    simMock.requestPermissions.mockResolvedValue({ readSimCard: 'granted' });
    simMock.getSimCards.mockResolvedValue({
      simCards: [
        {
          carrierName: '',
          isoCountryCode: '',
          mobileCountryCode: '',
          mobileNetworkCode: ''
        },
        {
          carrierName: 'Carrier A',
          isoCountryCode: 'us',
          mobileCountryCode: '310',
          mobileNetworkCode: '260',
          number: '+11234567890',
          subscriptionId: '123',
          simSlotIndex: 0
        }
      ]
    });
    simMock.getPluginVersion.mockResolvedValue({ version: '8.0.0' });

    const snapshot = await readSimInventory();

    expect(snapshot.status).toBe('ready');
    expect(snapshot.permission).toBe('granted');
    expect(snapshot.pluginVersion).toBe('8.0.0');
    expect(snapshot.slots).toHaveLength(2);
    expect(snapshot.slots[0].state).toBe('empty');
    expect(snapshot.slots[0].label).toBe('SIM 1');
    expect(snapshot.slots[1]).toMatchObject({
      id: '123',
      slotIndex: 0,
      label: 'Carrier A',
      state: 'ready'
    });
  });
});
