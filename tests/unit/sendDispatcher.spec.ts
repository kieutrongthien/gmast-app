import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/messages/preSendStatusService', () => ({
  checkPreSendStatus: vi.fn()
}));

vi.mock('@/services/messages/analytics', () => ({
  emitAnalyticsEvent: vi.fn()
}));

import { checkPreSendStatus } from '@/services/messages/preSendStatusService';
import { dispatchQueueSequentially } from '@/services/messages/sendDispatcher';
import { PreSendState } from '@/types/messageStatus';
import { emitAnalyticsEvent } from '@/services/messages/analytics';

const mockedStatus = vi.mocked(checkPreSendStatus);
const mockedAnalytics = vi.mocked(emitAnalyticsEvent);

const message = (id: string) => ({
  id,
  to: '+84123456789',
  body: 'test',
  mediaUrls: [],
  channel: 'sms',
  priority: 'normal',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  retryCount: 0,
  tags: []
});

describe('dispatchQueueSequentially', () => {
  it('skips already sent messages', async () => {
    mockedStatus.mockResolvedValueOnce({
      messageId: '1',
      state: PreSendState.AlreadySent,
      canSend: false,
      rawStatus: 'sent',
      flags: {},
      reason: 'Message already sent'
    });

    const handler = vi.fn();
    const onSkip = vi.fn();

    const result = await dispatchQueueSequentially([message('1')], handler, { onSkip });

    expect(handler).not.toHaveBeenCalled();
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(result[0].skipped).toBe(true);
    expect(mockedAnalytics).toHaveBeenCalledWith('send_skip', expect.objectContaining({ messageId: '1' }));
  });

  it('dispatches sendable messages', async () => {
    mockedStatus.mockResolvedValueOnce({
      messageId: '2',
      state: PreSendState.Sendable,
      canSend: true,
      rawStatus: 'pending',
      flags: {}
    });

    const handler = vi.fn();
    const onDispatch = vi.fn();

    const result = await dispatchQueueSequentially([message('2')], handler, { onDispatch });

    expect(onDispatch).toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
    expect(result[0].skipped).toBe(false);
  });

  it('invokes onResult for both skipped and sent messages', async () => {
    mockedStatus
      .mockResolvedValueOnce({
        messageId: 'skip',
        state: PreSendState.AlreadyProcessing,
        canSend: false,
        rawStatus: 'processing',
        flags: {},
        reason: 'Processing'
      })
      .mockResolvedValueOnce({
        messageId: 'send',
        state: PreSendState.Sendable,
        canSend: true,
        rawStatus: 'pending',
        flags: {}
      });

    const handler = vi.fn();
    const onResult = vi.fn();

    await dispatchQueueSequentially([message('skip'), message('send')], handler, { onResult });

    expect(onResult).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenNthCalledWith(1, expect.objectContaining({ skipped: true }));
    expect(onResult).toHaveBeenNthCalledWith(2, expect.objectContaining({ skipped: false }));
  });

  it('stops dispatching when cancelled', async () => {
    mockedStatus.mockResolvedValue({
      messageId: '3',
      state: PreSendState.Sendable,
      canSend: true,
      rawStatus: 'pending',
      flags: {}
    });

    const handler = vi.fn();
    const isCancelled = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const queue = [message('3'), message('4')];

    await dispatchQueueSequentially(queue, handler, { isCancelled });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(isCancelled).toHaveBeenCalledTimes(2);
  });
});
