const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

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

/** @returns {string | null} Error message or null */
function passwordStrengthError(password) {
  const pw = String(password);
  if (pw.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  if (pw.length > PASSWORD_MAX) return 'Password must be 128 characters or less';
  if (WEAK_PASSWORDS.has(pw.toLowerCase())) {
    return 'This password is too common or too plain. Use a stronger password with letters and numbers.';
  }
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Password must include at least one letter and one number';
  }
  return null;
}

export function isRequired(value) {
  if (value == null) return false;
  const s = String(value).trim();
  return s.length > 0;
}

export function isValidEmail(value) {
  if (!value || typeof value !== 'string') return false;
  return EMAIL_REGEX.test(value.trim());
}

export function isMinLength(value, min) {
  if (value == null) return false;
  return String(value).length >= min;
}

export function isMaxLength(value, max) {
  if (value == null) return true;
  return String(value).length <= max;
}

export function isPositiveNumber(value) {
  if (value === '' || value == null) return false;
  const n = Number(value);
  return !Number.isNaN(n) && n >= 1;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!isRequired(email)) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email';
  if (!isRequired(password)) errors.password = 'Password is required';
  else if (!isMaxLength(password, PASSWORD_MAX)) errors.password = 'Password is too long';
  return errors;
}

const REGISTER_ROLES = new Set(['student', 'admin']);

export function validateRegister({ email, password, name, role }) {
  const errors = {};
  if (!isRequired(name)) errors.name = 'Name is required';
  if (!isRequired(email)) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email';
  if (!isRequired(password)) errors.password = 'Password is required';
  else {
    const pwdErr = passwordStrengthError(password);
    if (pwdErr) errors.password = pwdErr;
  }
  const r = role == null || role === '' ? 'student' : role;
  if (!REGISTER_ROLES.has(r)) errors.role = 'Choose student or administrator';
  return errors;
}

export function validateService({ name, description, expectedDurationMinutes, priorityLevel }) {
  const errors = {};
  if (!isRequired(name)) errors.name = 'Service name is required';
  else if (!isMaxLength(name, 100)) errors.name = 'Service name must be 100 characters or less';
  if (!isRequired(description)) errors.description = 'Description is required';
  if (!isRequired(expectedDurationMinutes) && expectedDurationMinutes !== 0) errors.expectedDurationMinutes = 'Expected duration is required';
  else if (!isPositiveNumber(expectedDurationMinutes)) errors.expectedDurationMinutes = 'Duration must be at least 1 minute';
  if (!isRequired(priorityLevel)) errors.priorityLevel = 'Priority level is required';
  return errors;
}
