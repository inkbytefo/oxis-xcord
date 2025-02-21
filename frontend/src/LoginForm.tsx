import { useState, FormEvent } from 'react';
import axios from 'axios';

const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(
        'http://localhost:3001/api/v1/auth/login',
        { email, password }
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Network error occurred');
    }
  }
};

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
  message?: string;
  error?: string;
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
      const data = await authService.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = [
    'w-full px-3 py-2',
    'border border-gray-300 rounded-md',
    'focus:outline-none focus:ring-2',
    'focus:ring-blue-500',
    'disabled:bg-gray-100'
  ].join(' ');

  const submitButtonClasses = [
    'w-full py-2 px-4',
    'bg-blue-500 text-white font-semibold rounded-lg shadow-md',
    'hover:bg-blue-700 focus:outline-none',
    'focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75',
    'disabled:bg-gray-400 disabled:cursor-not-allowed'
  ].join(' ');

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
            E-posta
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            disabled={loading}
            className={inputClasses}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            Şifre
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifreniz"
            disabled={loading}
            className={inputClasses}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={submitButtonClasses}
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
};
