import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateRegister } from '../utils/validation';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import styles from './Auth.module.css';
import regStyles from './Register.module.css';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validateRegister({ email, password, name, role });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const result = await register(email, password, name, role);
    if (result.ok) {
      navigate(result.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } else if (result.status === 409) {
      setSubmitError('Email already registered. Please sign in or use another email.');
    } else {
      setSubmitError(result.message || 'Registration failed. Please check your details.');
    }
  };

  return (
    <div className={regStyles.page}>
      <div className={`${styles.hero} ${regStyles.heroReadable}`}>
        <h1 className={styles.heroTitle}>QueueSmart</h1>
        <p className={styles.heroTagline}>Campus queue management — join lines smarter, wait less.</p>
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>Create your account</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}
          <Input
            label="Name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <div>
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <p className={styles.passwordHint}>
              Use at least 8 characters with both letters and numbers. Common or plain passwords are not allowed.
            </p>
          </div>
          <fieldset className={styles.roleFieldset}>
            <legend className={styles.roleLegend}>Account type</legend>
            <div className={styles.roleOptions}>
              <label className={styles.roleOption}>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === 'student'}
                  onChange={() => setRole('student')}
                />
                <span>Student — join queues and view status</span>
              </label>
              <label className={styles.roleOption}>
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                />
                <span>Administrator — manage services and queues</span>
              </label>
            </div>
            {errors.role && <span className={styles.roleError}>{errors.role}</span>}
          </fieldset>
          <Button type="submit" className={styles.submit}>
          <UserPlus size={18} aria-hidden />
          Register
        </Button>
        </form>
        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
