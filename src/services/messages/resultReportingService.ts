import { httpClient } from '@/lib/httpClient';
import { withRetry } from '@/utils/retry';
import type { DeliveryResultPayload, DeliveryResultResponse } from '@/types/messageResult';

const RESULT_ENDPOINT = (messageId: string) => `/messages/${messageId}/result`;

const DEFAULT_ATTEMPTS = 3;

export const reportDeliveryResult = async (
  payload: DeliveryResultPayload,
  attempts = DEFAULT_ATTEMPTS
): Promise<DeliveryResultResponse> => {
  if (!payload.messageId) {
    throw new Error('reportDeliveryResult requires messageId');
  }

  const response = await withRetry(
    () => httpClient.post<DeliveryResultResponse>(RESULT_ENDPOINT(payload.messageId), payload),
    { retries: attempts - 1 }
  );

  return response.data;
};
