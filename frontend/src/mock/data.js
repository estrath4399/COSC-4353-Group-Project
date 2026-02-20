let nextUserId = 4;
let nextServiceId = 4;
let nextQueueId = 1;
let nextHistoryId = 1;

export const users = [
  { id: '1', email: 'student@test.com', password: 'password', name: 'Alex Student', role: 'student' },
  { id: '2', email: 'admin@test.com', password: 'password', name: 'Admin User', role: 'admin' },
  { id: '3', email: 'jane@test.com', password: 'password', name: 'Jane Doe', role: 'student' },
];

export const services = [
  {
    id: '1',
    name: 'Advising',
    description: 'Academic advising and course planning.',
    expectedDurationMinutes: 15,
    priorityLevel: 'high',
    isOpen: true,
    estimatedWaitMinutes: 25,
  },
  {
    id: '2',
    name: 'Financial Aid',
    description: 'Financial aid and scholarship questions.',
    expectedDurationMinutes: 20,
    priorityLevel: 'medium',
    isOpen: true,
    estimatedWaitMinutes: 40,
  },
  {
    id: '3',
    name: 'Registrar',
    description: 'Transcripts and enrollment verification.',
    expectedDurationMinutes: 10,
    priorityLevel: 'low',
    isOpen: false,
    estimatedWaitMinutes: 0,
  },
];

export const queueEntries = [
  { id: 'q1', userId: '3', userName: 'Jane Doe', serviceId: '1', joinedAt: '2025-02-18T10:00:00', priority: 'high', status: 'waiting' },
  { id: 'q2', userId: '1', userName: 'Alex Student', serviceId: '1', joinedAt: '2025-02-18T10:05:00', priority: 'high', status: 'waiting' },
  { id: 'q3', userId: '2', userName: 'Admin User', serviceId: '2', joinedAt: '2025-02-18T09:50:00', priority: 'medium', status: 'almost_ready' },
];

export const history = [
  { id: 'h1', userId: '1', serviceId: '1', serviceName: 'Advising', date: '2025-02-17T14:30:00', outcome: 'Served' },
  { id: 'h2', userId: '1', serviceId: '2', serviceName: 'Financial Aid', date: '2025-02-16T11:00:00', outcome: 'Left' },
  { id: 'h3', userId: '3', serviceId: '1', serviceName: 'Advising', date: '2025-02-15T09:00:00', outcome: 'Served' },
];

export function getNextUserId() {
  return String(nextUserId++);
}
export function getNextServiceId() {
  return String(nextServiceId++);
}
export function getNextQueueId() {
  return String(nextQueueId++);
}
export function getNextHistoryId() {
  return String(nextHistoryId++);
}
