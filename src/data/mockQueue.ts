import type { QueueMessage, QueueSnapshot } from '@/types/queue';

const sampleBodies = [
  'Reminder: Campaign launch today at 3PM. Please confirm readiness.',
  'Promo code GM-2026 valid for next 2 hours. Send to VIP list.',
  'Two-factor code: 492110. Do not share with anyone.',
  'System alert: SIM slot 2 signal weak. Investigate before next batch.',
  'Appointment confirmation for tomorrow 09:30. Reply STOP to cancel.',
  'Welcome to GMAST! Tap the link to finish onboarding.',
  'Billing notice: invoice #81233 is due today. Pay via portal.',
  'Survey: How satisfied are you with our support? Reply 1-5.',
  'Logistics update: driver arrived at depot. Share tracking link.',
  'Security info: rotated API secret. Update clients by EOD.'
];

const statuses = ['pending', 'processing', 'sent', 'failed'] as const;
const priorities = ['low', 'normal', 'high', 'critical'] as const;

const randomItem = <T>(items: ReadonlyArray<T>): T => items[Math.floor(Math.random() * items.length)];

const buildPhone = (): string => `+84${Math.floor(100000000 + Math.random() * 900000000)}`;

const buildTimestamp = (offsetMinutes: number): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - offsetMinutes);
  return now.toISOString();
};

const buildMessage = (index: number): QueueMessage => {
  const priority = randomItem(priorities);
  return {
    id: `mock-${index}`,
    groupUsername: `group-${(index % 4) + 1}`,
    studentId: `S${(1000 + index).toString()}`,
    receiver: buildPhone(),
    title: `Thông báo ${index}`,
    message: randomItem(sampleBodies),
    dedupeKey: index % 3 === 0 ? `batch-${Math.ceil(index / 3)}` : null,
    priority,
    status: randomItem(statuses),
    createdAt: buildTimestamp(index + 5),
    updatedAt: buildTimestamp(index),
    retryCount: Math.floor(Math.random() * 3),
    tags: priority === 'critical' ? ['priority'] : []
  };
};

export const buildMockQueueSnapshot = (count = 120): QueueSnapshot => {
  const messages: QueueMessage[] = Array.from({ length: count }, (_value, index) => buildMessage(index + 1));
  const pageSize = 50;
  const totalPages = Math.ceil(count / pageSize);
  const fetchedAt = new Date().toISOString();

  return {
    messages,
    meta: {
      page: 1,
      pageSize,
      totalPages,
      totalItems: count,
      hasNextPage: totalPages > 1,
      fetchedAt
    },
    updatedAt: fetchedAt
  };
};
