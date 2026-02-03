import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/httpClient', () => ({
  httpClient: {
    get: vi.fn()
  }
}));

vi.mock('@/utils/retry', () => ({
  withRetry: <T>(operation: () => Promise<T>) => operation()
}));

import { httpClient } from '@/lib/httpClient';
import { checkPreSendStatus } from '@/services/messages/preSendStatusService';
import { PreSendState } from '@/types/messageStatus';

const mockedHttpClient = vi.mocked(httpClient, true);

describe('checkPreSendStatus', () => {
  beforeEach(() => {
    mockedHttpClient.get.mockReset();
  });

  it('returns sendable for pending status', async () => {
    mockedHttpClient.get.mockResolvedValue({
      data: {
        status: 'pending'
      }
    });

    const result = await checkPreSendStatus('msg-1');
    expect(result.canSend).toBe(true);
    expect(result.state).toBe(PreSendState.Sendable);
  });

  it('returns already sent when API reports sent', async () => {
    mockedHttpClient.get.mockResolvedValue({
      data: {
        status: 'sent',
        flags: { sent: true }
      }
    });

    const result = await checkPreSendStatus('msg-2');
    expect(result.canSend).toBe(false);
    expect(result.state).toBe(PreSendState.AlreadySent);
  });

  it('treats 404 as sendable', async () => {
    mockedHttpClient.get.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 }
    });

    const result = await checkPreSendStatus('missing-msg');
    expect(result.canSend).toBe(true);
    expect(result.state).toBe(PreSendState.NotFound);
  });

  it('throws for other errors', async () => {
    mockedHttpClient.get.mockRejectedValue(new Error('boom'));

    await expect(checkPreSendStatus('msg-err')).rejects.toThrow('boom');
  });
});
