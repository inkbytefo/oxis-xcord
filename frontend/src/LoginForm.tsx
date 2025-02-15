import { useState, FormEvent } from 'react';
import './LoginForm.css';

interface LoginFormProps {
  onLogin: (token: string) => void;
}

interface LoginResponse {
  token: string;
  user: {
    email: string;
    username: string;
    roles: string[];
  };
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!email) {
      setError('E-posta adresi gerekli');
      return false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Geçerli bir e-posta adresi giriniz');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.token || 'Giriş başarısız');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Giriş Yap</h2>
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="email">E-posta</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Şifre</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifreniz"
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
};