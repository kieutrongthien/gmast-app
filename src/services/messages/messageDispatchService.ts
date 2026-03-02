import type { QueueMessage } from '@/types/queue';
import { syncDeliveryResult } from '@/services/messages/resultSyncManager';
import { getSendConfig } from '@/services/messages/sendConfigService';

const parseSimSlot = (slotId: string | null): number | undefined => {
  if (!slotId) {
    return undefined;
  }

  const numeric = Number(slotId);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const matched = slotId.match(/(\d+)/);
  if (!matched) {
    return undefined;
  }

  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const dispatchQueuedMessage = async (message: QueueMessage): Promise<void> => {
  const sendConfig = await getSendConfig();

  await syncDeliveryResult({
    messageId: message.id,
    outcome: 'sent',
    sentAt: new Date().toISOString(),
    simSlot: sendConfig.simMode === 'manual' ? parseSimSlot(sendConfig.simSlotId) : undefined,
    metadata: {
      receiver: message.receiver,
      simMode: sendConfig.simMode,
      simSlotId: sendConfig.simSlotId
    }
  });
};
