import { Capacitor } from '@capacitor/core';
import { Sim, type PermissionStatus, type SimCard } from '@capgo/capacitor-sim';
import type { PermissionState } from '@capacitor/core';
import type {
  SimInventoryOptions,
  SimInventorySnapshot,
  SimInventoryStatus,
  SimPlatform,
  SimSlotMetadata,
  SimSlotState
} from '@/types/sim';

const SUPPORTED_PLATFORMS: SimPlatform[] = ['android', 'ios'];

const resolvePlatform = (): SimPlatform => {
  const platform = Capacitor.getPlatform?.() ?? 'web';

  if (platform === 'android' || platform === 'ios' || platform === 'web') {
    return platform;
  }

  return 'unknown';
};

const isSupportedRuntime = (): boolean => {
  const platform = resolvePlatform();
  return SUPPORTED_PLATFORMS.includes(platform);
};

const isSimPluginAvailable = (): boolean => {
  const hasChecker = typeof Capacitor.isPluginAvailable === 'function';
  return hasChecker ? Capacitor.isPluginAvailable('Sim') : true;
};

const deriveSlotState = (card: SimCard): SimSlotState => {
  const hasNetworkCodes = Boolean(card.mobileCountryCode && card.mobileNetworkCode);
  const hasAnyIdentity = Boolean(card.carrierName?.trim() || card.number);

  if (hasNetworkCodes) {
    return 'ready';
  }

  if (hasAnyIdentity) {
    return 'unknown';
  }

  return 'empty';
};

const normalizeSimCard = (card: SimCard, fallbackIndex: number): SimSlotMetadata => {
  const slotIndex = typeof card.simSlotIndex === 'number' ? card.simSlotIndex : null;
  const subscriptionId = card.subscriptionId ?? undefined;
  const label = card.carrierName?.trim() || `SIM ${fallbackIndex + 1}`;
  const id = subscriptionId ?? (slotIndex !== null ? `slot-${slotIndex}` : `sim-${fallbackIndex}`);

  return {
    id,
    slotIndex,
    label,
    carrierName: card.carrierName,
    isoCountryCode: card.isoCountryCode,
    mobileCountryCode: card.mobileCountryCode,
    mobileNetworkCode: card.mobileNetworkCode,
    phoneNumber: card.number ?? undefined,
    subscriptionId,
    state: deriveSlotState(card)
  };
};

const toSnapshot = (
  status: SimInventoryStatus,
  permission: PermissionState,
  platform: SimPlatform,
  slots: SimSlotMetadata[],
  reason?: string,
  pluginVersion?: string
): SimInventorySnapshot => ({
  status,
  permission,
  platform,
  slots,
  fetchedAt: new Date().toISOString(),
  pluginVersion,
  reason
});

const getPermission = async (): Promise<PermissionStatus> => Sim.checkPermissions();

const requestPermission = async (): Promise<PermissionStatus> => Sim.requestPermissions();

export const ensureSimReadPermission = async (): Promise<PermissionState> => {
  if (!isSupportedRuntime() || !isSimPluginAvailable()) {
    return 'denied';
  }

  const current = await getPermission();

  if (current.readSimCard === 'granted') {
    return current.readSimCard;
  }

  const updated = await requestPermission();
  return updated.readSimCard;
};

export const readSimInventory = async (
  options: SimInventoryOptions = {}
): Promise<SimInventorySnapshot> => {
  const platform = resolvePlatform();
  const requestAccess = options.requestPermission ?? true;

  if (!isSupportedRuntime()) {
    return toSnapshot('unsupported', 'denied', platform, [], 'unsupported-platform');
  }

  if (!isSimPluginAvailable()) {
    return toSnapshot('unsupported', 'denied', platform, [], 'sim-plugin-unavailable');
  }

  let permissionStatus = await getPermission();

  if (permissionStatus.readSimCard !== 'granted' && requestAccess) {
    permissionStatus = await requestPermission();
  }

  if (permissionStatus.readSimCard !== 'granted') {
    return toSnapshot('permission-denied', permissionStatus.readSimCard, platform, [], 'readSimCard-denied');
  }

  const [{ simCards }, pluginVersion] = await Promise.all([
    Sim.getSimCards(),
    Sim.getPluginVersion().catch(() => undefined)
  ]);

  const slots = simCards.map(normalizeSimCard);
  const reason = platform === 'ios' ? 'ios-carrier-restrictions' : undefined;

  return toSnapshot('ready', permissionStatus.readSimCard, platform, slots, reason, pluginVersion?.version);
};
