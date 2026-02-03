import type { PermissionState } from '@capacitor/core';

export type SimPlatform = 'android' | 'ios' | 'web' | 'unknown';

export type SimInventoryStatus = 'ready' | 'permission-denied' | 'unsupported';

export type SimSlotState = 'ready' | 'empty' | 'unknown';

export interface SimSlotMetadata {
  id: string;
  slotIndex: number | null;
  label: string;
  carrierName: string;
  isoCountryCode: string;
  mobileCountryCode: string;
  mobileNetworkCode: string;
  phoneNumber?: string;
  subscriptionId?: string;
  state: SimSlotState;
}

export interface SimInventorySnapshot {
  status: SimInventoryStatus;
  slots: SimSlotMetadata[];
  platform: SimPlatform;
  permission: PermissionState;
  fetchedAt: string;
  pluginVersion?: string;
  reason?: string;
}

export interface SimInventoryOptions {
  /**
   * If true (default), request READ_PHONE_STATE permission when needed.
   */
  requestPermission?: boolean;
}
