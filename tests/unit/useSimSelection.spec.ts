import { describe, it, expect, beforeEach, vi } from 'vitest';

const readSimInventoryMock = vi.fn();
const getSendConfigMock = vi.fn();
const updateSendConfigMock = vi.fn();
const subscribeMock = vi.fn();

vi.mock('@/services/sim', () => ({
  readSimInventory: (...args: unknown[]) => readSimInventoryMock(...args)
}));

vi.mock('@/services/messages/sendConfigService', () => ({
  getDefaultSendConfig: () => ({ simMode: 'random', simSlotId: null }),
  getSendConfig: (...args: unknown[]) => getSendConfigMock(...args),
  updateSendConfig: (...args: unknown[]) => updateSendConfigMock(...args),
  subscribeToSendConfig: (...args: unknown[]) => subscribeMock(...args)
}));

describe('useSimSelection', () => {
  beforeEach(() => {
    vi.resetModules();
    readSimInventoryMock.mockReset();
    getSendConfigMock.mockReset();
    updateSendConfigMock.mockReset();
    subscribeMock.mockReset();
  });

  const buildSnapshot = () => ({
    status: 'ready',
    permission: 'granted',
    platform: 'android',
    fetchedAt: new Date().toISOString(),
    slots: [
      {
        id: 'sim-a',
        slotIndex: 0,
        label: 'SIM A',
        carrierName: 'Viettel',
        isoCountryCode: 'vn',
        mobileCountryCode: '452',
        mobileNetworkCode: '04',
        state: 'ready'
      },
      {
        id: 'sim-b',
        slotIndex: 1,
        label: 'SIM B',
        carrierName: 'Mobi',
        isoCountryCode: 'vn',
        mobileCountryCode: '452',
        mobileNetworkCode: '05',
        state: 'unknown'
      }
    ]
  });

  it('initializes selection and loads inventory', async () => {
    const snapshot = buildSnapshot();
    getSendConfigMock.mockResolvedValue({ simMode: 'random', simSlotId: null });
    readSimInventoryMock.mockResolvedValue(snapshot);
    subscribeMock.mockReturnValue(() => {});

    const { useSimSelection, __resetSimSelectionForTests } = await import('@/composables/useSimSelection');
    const hook = useSimSelection();
    await hook.initialize();

    expect(readSimInventoryMock).toHaveBeenCalledTimes(1);
    expect(hook.slots.value).toHaveLength(2);
    __resetSimSelectionForTests();
  });

  it('reconciles manual selection when stored slot is missing', async () => {
    const snapshot = buildSnapshot();
    getSendConfigMock.mockResolvedValue({ simMode: 'manual', simSlotId: 'missing' });
    readSimInventoryMock.mockResolvedValue(snapshot);
    subscribeMock.mockReturnValue(() => {});

    const { useSimSelection, __resetSimSelectionForTests } = await import('@/composables/useSimSelection');
    const hook = useSimSelection();
    await hook.initialize();

    expect(updateSendConfigMock).toHaveBeenCalledWith({ simMode: 'manual', simSlotId: 'sim-a' });
    expect(hook.selectedSlot.value?.id).toBe('sim-a');
    __resetSimSelectionForTests();
  });

  it('switches to random mode and clears manual choice', async () => {
    const snapshot = buildSnapshot();
    getSendConfigMock.mockResolvedValue({ simMode: 'manual', simSlotId: 'sim-b' });
    readSimInventoryMock.mockResolvedValue(snapshot);
    subscribeMock.mockReturnValue(() => {});

    const { useSimSelection, __resetSimSelectionForTests } = await import('@/composables/useSimSelection');
    const hook = useSimSelection();
    await hook.initialize();
    await hook.setMode('random');

    expect(updateSendConfigMock).toHaveBeenLastCalledWith({ simMode: 'random', simSlotId: null });
    expect(hook.selectedSlotId.value).toBeNull();
    __resetSimSelectionForTests();
  });
});
