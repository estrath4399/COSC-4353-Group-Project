import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateRegister } from '../utils/validation';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import styles from './Auth.module.css';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validateRegister({ email, password, name });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const user = await register(email, password, name);
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      setSubmitError('Email already registered. Please sign in or use another email.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
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
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
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
