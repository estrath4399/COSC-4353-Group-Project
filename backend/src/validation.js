const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  emailMax: 255,
  passwordMin: 8,
  passwordMax: 128,
  nameMax: 100,
  serviceNameMax: 100,
  descriptionMax: 2000,
};

/** Trivial passwords — not allowed (aligns with “no plain / easily guessed passwords”). */
const WEAK_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  'qwerty123',
  'plaintext',
  'letmein',
  'welcome1',
  'admin123',
  'queuesmart',
]);

/**
 * @param {string} pw
 * @returns {string | null} Error message, or null if OK
 */
export function validatePasswordStrength(pw) {
  if (pw.length < LIMITS.passwordMin) {
    return `Password must be at least ${LIMITS.passwordMin} characters`;
  }
  if (pw.length > LIMITS.passwordMax) return 'Password is too long';
  if (WEAK_PASSWORDS.has(pw.toLowerCase())) {
    return 'This password is too common or too plain. Choose a stronger password with letters and numbers.';
  }
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Password must include at least one letter and one number';
  }
  return null;
}

export function validationError(message) {
  return { ok: false, status: 400, message };
}

const REGISTER_ROLES = new Set(['student', 'admin']);

export function validateRegisterBody(body) {
  if (!body || typeof body !== 'object') return validationError('Request body is required');
  const { email, password, name, role: roleRaw } = body;
  if (name == null || String(name).trim() === '') return validationError('Name is required');
  if (String(name).length > LIMITS.nameMax) return validationError(`Name must be at most ${LIMITS.nameMax} characters`);
  if (email == null || String(email).trim() === '') return validationError('Email is required');
  const em = String(email).trim();
  if (em.length > LIMITS.emailMax) return validationError('Email is too long');
  if (!EMAIL_REGEX.test(em)) return validationError('Invalid email format');
  if (password == null || String(password) === '') return validationError('Password is required');
  const pw = String(password);
  const pwdErr = validatePasswordStrength(pw);
  if (pwdErr) return validationError(pwdErr);
  const role =
    roleRaw === undefined || roleRaw === null || String(roleRaw).trim() === ''
      ? 'student'
      : String(roleRaw).trim();
  if (!REGISTER_ROLES.has(role)) {
    return validationError('Role must be student or admin');
  }
  return { ok: true, value: { email: em, password: pw, name: String(name).trim(), role } };
}

export function validateLoginBody(body) {
  if (!body || typeof body !== 'object') return validationError('Request body is required');
  const { email, password } = body;
  if (email == null || String(email).trim() === '') return validationError('Email is required');
  const em = String(email).trim();
  if (em.length > LIMITS.emailMax) return validationError('Email is too long');
  if (!EMAIL_REGEX.test(em)) return validationError('Invalid email format');
  if (password == null || String(password) === '') return validationError('Password is required');
  if (String(password).length > LIMITS.passwordMax) return validationError('Password is too long');
  return { ok: true, value: { email: em, password: String(password) } };
}

const PRIORITIES = new Set(['low', 'medium', 'high']);

export function validateServiceBody(body, partial = false) {
  if (!body || typeof body !== 'object') return validationError('Request body is required');
  const name = body.name;
  const description = body.description;
  const expectedDurationMinutes = body.expectedDurationMinutes;
  const priorityLevel = body.priorityLevel;

  if (!partial || name !== undefined) {
    if (name == null || String(name).trim() === '') return validationError('Service name is required');
    if (String(name).length > LIMITS.serviceNameMax)
      return validationError(`Service name must be at most ${LIMITS.serviceNameMax} characters`);
  }
  if (!partial || description !== undefined) {
    if (description == null || String(description).trim() === '')
      return validationError('Description is required');
    if (String(description).length > LIMITS.descriptionMax)
      return validationError('Description is too long');
  }
  if (!partial || expectedDurationMinutes !== undefined) {
    const n = Number(expectedDurationMinutes);
    if (expectedDurationMinutes === '' || expectedDurationMinutes == null || Number.isNaN(n))
      return validationError('Expected duration must be a number');
    if (!Number.isInteger(n) || n < 1) return validationError('Expected duration must be an integer of at least 1');
    if (n > 480) return validationError('Expected duration cannot exceed 480 minutes');
  }
  if (!partial || priorityLevel !== undefined) {
    if (priorityLevel == null || String(priorityLevel).trim() === '')
      return validationError('Priority level is required');
    if (!PRIORITIES.has(String(priorityLevel))) return validationError('Priority must be low, medium, or high');
  }

  return {
    ok: true,
    value: {
      name: name !== undefined ? String(name).trim() : undefined,
      description: description !== undefined ? String(description).trim() : undefined,
      expectedDurationMinutes:
        expectedDurationMinutes !== undefined ? Number(expectedDurationMinutes) : undefined,
      priorityLevel: priorityLevel !== undefined ? String(priorityLevel) : undefined,
    },
  };
}

export { LIMITS };
