const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  else if (!isMinLength(password, 6)) errors.password = 'Password must be at least 6 characters';
  return errors;
}

export function validateRegister({ email, password, name }) {
  const errors = {};
  if (!isRequired(name)) errors.name = 'Name is required';
  if (!isRequired(email)) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email';
  if (!isRequired(password)) errors.password = 'Password is required';
  else if (!isMinLength(password, 6)) errors.password = 'Password must be at least 6 characters';
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
