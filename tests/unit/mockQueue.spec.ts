import { describe, it, expect } from 'vitest';
import { buildMockQueueSnapshot } from '@/data/mockQueue';

describe('buildMockQueueSnapshot', () => {
  it('generates the requested number of messages', () => {
    const snapshot = buildMockQueueSnapshot(25);
    expect(snapshot.messages).toHaveLength(25);
    expect(snapshot.meta.totalItems).toBe(25);
  });

  it('sets pagination metadata consistently', () => {
    const snapshot = buildMockQueueSnapshot(120);
    expect(snapshot.meta.page).toBe(1);
    expect(snapshot.meta.pageSize).toBeGreaterThan(0);
    expect(snapshot.meta.totalPages).toBeGreaterThan(1);
    expect(snapshot.meta.hasNextPage).toBe(true);
    expect(snapshot.updatedAt).toBeTruthy();
  });
});
