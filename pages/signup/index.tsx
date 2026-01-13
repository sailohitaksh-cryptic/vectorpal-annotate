import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to dashboard after successful signup
        router.push('/dashboard');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up - Mosquito Annotation</title>
      </Head>
      
      <div style={styles.container}>
        <div style={styles.logoContainer}>
          <div style={styles.logoCircle}>
            <div style={styles.mosquitoIcon}>🦟</div>
          </div>
        </div>

        <h1 style={styles.title}>Create your account</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p style={styles.loginText}>
          Already have an account?{' '}
          <Link href="/login" style={styles.loginLink}>
            Log in
          </Link>
        </p>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: '#0a0a0a',
  },
  logoContainer: {
    marginBottom: '40px',
  },
  logoCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)',
  },
  mosquitoIcon: {
    fontSize: '60px',
    filter: 'grayscale(100%) brightness(0) invert(1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '500',
    marginBottom: '40px',
    color: '#ffffff',
  },
  form: {
    width: '100%',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  inputGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#ffffff',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    backgroundColor: '#3a4556',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  error: {
    padding: '12px',
    marginBottom: '16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '14px',
  },
  loginText: {
    marginTop: '24px',
    fontSize: '14px',
    color: '#9ca3af',
  },
  loginLink: {
    color: '#3b82f6',
    textDecoration: 'underline',
  },
};
