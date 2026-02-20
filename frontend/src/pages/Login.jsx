import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateLogin } from '../utils/validation';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import styles from './Login.module.css';

export function Login() {
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const from = location.state?.from?.pathname || (isAdmin ? '/admin' : '/dashboard');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validateLogin({ email, password });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const user = await login(email, password);
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } else {
      setSubmitError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.imagePanel}>
        <img
          src="/images/campus-hero.png"
          alt="University campus courtyard"
          className={styles.image}
        />
        <div className={styles.imageOverlay} aria-hidden />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>QueueSmart</h1>
          <p className={styles.heroTagline}>Campus queue management — join lines smarter, wait less.</p>
        </div>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.mobileHero}>
          <h1 className={styles.mobileHeroTitle}>QueueSmart</h1>
          <p className={styles.mobileHeroTagline}>Campus queue management</p>
        </div>
        <div className={styles.card}>
        <h1 className={styles.title}>Sign in to QueueSmart</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Button type="submit" className={styles.submit}>
            <LogIn size={18} aria-hidden />
            Sign in
          </Button>
        </form>
        <p className={styles.footer}>
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
