import { describe, it, expect } from 'vitest';
import {
  priorityRank,
  compareEntries,
  sortWaitingEntries,
  waitingPosition,
  estimatedWaitMinutesForPosition,
  displayStatus,
} from '../src/lib/queueLogic.js';

describe('queueLogic', () => {
  it('orders priority high before low at same orderIndex', () => {
    const a = { userId: '1', priority: 'low', orderIndex: 1, status: 'waiting' };
    const b = { userId: '2', priority: 'high', orderIndex: 2, status: 'waiting' };
    const sorted = sortWaitingEntries([a, b]);
    expect(sorted[0].userId).toBe('2');
  });

  it('uses orderIndex when priority ties', () => {
    const a = { userId: '1', priority: 'high', orderIndex: 2, status: 'waiting' };
    const b = { userId: '2', priority: 'high', orderIndex: 1, status: 'waiting' };
    const sorted = sortWaitingEntries([a, b]);
    expect(sorted[0].userId).toBe('2');
  });

  it('computes waiting position 1-based', () => {
    const sorted = [
      { userId: 'a', priority: 'high', orderIndex: 1, status: 'waiting' },
      { userId: 'b', priority: 'high', orderIndex: 2, status: 'waiting' },
    ];
    expect(waitingPosition(sorted, 'b')).toBe(2);
    expect(waitingPosition(sorted, 'c')).toBeNull();
  });

  it('estimated wait uses people ahead only', () => {
    expect(estimatedWaitMinutesForPosition(1, 15)).toBe(0);
    expect(estimatedWaitMinutesForPosition(3, 10)).toBe(20);
  });

  it('displayStatus almost_ready when first', () => {
    const sorted = [{ userId: 'x', priority: 'low', orderIndex: 1, status: 'waiting' }];
    expect(displayStatus(sorted, 'x')).toBe('almost_ready');
    expect(displayStatus(sorted, 'y')).toBeNull();
  });

  it('priorityRank maps levels', () => {
    expect(priorityRank('high')).toBeGreaterThan(priorityRank('medium'));
    expect(compareEntries(
      { priority: 'medium', orderIndex: 1 },
      { priority: 'high', orderIndex: 2 }
    )).toBeGreaterThan(0);
  });
});
