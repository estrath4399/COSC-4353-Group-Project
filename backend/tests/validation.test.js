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
    const r = validateRegisterBody({ email: ' NEW@EX.COM ', password: 'ValidReg9', name: '  N  ' });
    expect(r.ok).toBe(true);
    expect(r.value.email).toBe('NEW@EX.COM');
    expect(r.value.name).toBe('N');
  });

  it('rejects common plain password on register', () => {
    const r = validateRegisterBody({ email: 'a@b.co', password: 'password', name: 'A' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/common|plain/i);
  });

  it('rejects register password without a number', () => {
    const r = validateRegisterBody({ email: 'a@b.co', password: 'OnlyLetters', name: 'A' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/letter.*number|number/i);
  });

  it('rejects invalid register role', () => {
    const r = validateRegisterBody({
      email: 'a@b.co',
      password: 'ValidReg9',
      name: 'A',
      role: 'superuser',
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/role/i);
  });

  it('accepts register as admin', () => {
    const r = validateRegisterBody({
      email: 'admin2@test.com',
      password: 'AdminReg9',
      name: 'Admin Two',
      role: 'admin',
    });
    expect(r.ok).toBe(true);
    expect(r.value.role).toBe('admin');
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
