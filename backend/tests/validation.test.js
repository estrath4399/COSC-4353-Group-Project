import { describe, it, expect } from 'vitest';
import { validateRegisterBody, validateLoginBody, validateServiceBody } from '../src/validation.js';

describe('validation', () => {
  it('rejects invalid register email', () => {
    const r = validateRegisterBody({ email: 'bad', password: 'secret1', name: 'A' });
    expect(r.ok).toBe(false);
  });

  it('rejects short password on register', () => {
    const r = validateRegisterBody({ email: 'a@b.co', password: 'short', name: 'A' });
    expect(r.ok).toBe(false);
  });

  it('accepts valid register', () => {
    const r = validateRegisterBody({ email: ' NEW@EX.COM ', password: 'password', name: '  N  ' });
    expect(r.ok).toBe(true);
    expect(r.value.email).toBe('NEW@EX.COM');
    expect(r.value.name).toBe('N');
  });

  it('rejects login missing password', () => {
    const r = validateLoginBody({ email: 'a@b.co' });
    expect(r.ok).toBe(false);
  });

  it('validates full service body', () => {
    const ok = validateServiceBody({
      name: 'X',
      description: 'Y',
      expectedDurationMinutes: 5,
      priorityLevel: 'low',
    });
    expect(ok.ok).toBe(true);
  });

  it('rejects service duration below 1', () => {
    const r = validateServiceBody({
      name: 'X',
      description: 'Y',
      expectedDurationMinutes: 0,
      priorityLevel: 'low',
    });
    expect(r.ok).toBe(false);
  });

  it('allows partial service update with single field', () => {
    const r = validateServiceBody({ name: 'Only' }, true);
    expect(r.ok).toBe(true);
  });
});
