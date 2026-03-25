/** @param {string} level */
export function priorityRank(level) {
  const m = { high: 3, medium: 2, low: 1 };
  return m[level] ?? 0;
}

/** @param {{ priority: string, orderIndex: number }} a */
export function compareEntries(a, b) {
  const pr = priorityRank(b.priority) - priorityRank(a.priority);
  if (pr !== 0) return pr;
  return a.orderIndex - b.orderIndex;
}

/** @param {Array<{ status: string }>} entries */
export function sortWaitingEntries(entries) {
  return [...entries].filter((e) => e.status === 'waiting').sort(compareEntries);
}

/** @param {Array<{ userId: string }>} sortedWaiting */
export function waitingPosition(sortedWaiting, userId) {
  const idx = sortedWaiting.findIndex((e) => e.userId === userId);
  return idx === -1 ? null : idx + 1;
}

export function estimatedWaitMinutesForPosition(position, expectedDurationMinutes) {
  if (position == null || position < 1) return 0;
  return Math.max(0, (position - 1) * expectedDurationMinutes);
}

export function displayStatus(sortedWaiting, userId) {
  const pos = waitingPosition(sortedWaiting, userId);
  if (pos == null) return null;
  return pos === 1 ? 'almost_ready' : 'waiting';
}
