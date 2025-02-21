import React, { useState } from 'react';
import axios from 'axios';

const authService = {
  async register(
    username: string,
    email: string,
    password: string
  ): Promise<RegistrationResponse> {
    try {
      const response = await axios.post<RegistrationResponse>(
        'http://localhost:3001/api/v1/auth/register',
        { username, email, password }
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

interface FormData {
  username: string;
  email: string;
  password: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
}

interface RegistrationResponse {
  message?: string;
  error?: string;
}

interface RegistrationFormProps {
  onSuccess?: () => void;
}

// Password validation pattern broken into parts for readability
const passwordPattern = {
  lowerCase: '(?=.*[a-z])',
  upperCase: '(?=.*[A-Z])',
  digit: '(?=.*\\d)',
  special: '(?=.*[@$!%*?&])',
  length: '[A-Za-z\\d@$!%*?&]{8,}',
};

const passwordRegex = new RegExp(
  `^${passwordPattern.lowerCase}${passwordPattern.upperCase}` +
  `${passwordPattern.digit}${passwordPattern.special}${passwordPattern.length}$`
);

const passwordRequirements = [
  'En az 8 karakter uzunluğunda olmalı',
  'En az bir büyük harf içermeli',
  'En az bir küçük harf içermeli',
  'En az bir rakam içermeli',
  'En az bir özel karakter içermeli'
].join(', ');

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Kullanıcı adı gerekli';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'E-posta adresi gerekli';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gerekli';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = `Şifre: ${passwordRequirements}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const data = await authService.register(
        formData.username,
        formData.email,
        formData.password
      );

      setMessage('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bir hata oluştu');
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

  const labelClasses = 'block text-gray-700 text-sm font-bold mb-2';

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
        <h2 className="text-2xl font-bold mb-6 text-center">Kayıt Ol</h2>

        <div className="mb-4">
          <label htmlFor="username" className={labelClasses}>
            Kullanıcı Adı
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
            className={inputClasses}
          />
          {errors.username && (
            <span className="text-red-600 text-sm mt-1">{errors.username}</span>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="email" className={labelClasses}>
            E-posta
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            className={inputClasses}
          />
          {errors.email && (
            <span className="text-red-600 text-sm mt-1">{errors.email}</span>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className={labelClasses}>
            Şifre
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            className={inputClasses}
          />
          {errors.password && (
            <span className="text-red-600 text-sm mt-1">{errors.password}</span>
          )}
        </div>

        {message && (
          <div 
            className={`p-3 mb-4 rounded-md text-center ${
              message.includes('başarılı') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={submitButtonClasses}
        >
          {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
        </button>
      </form>
    </div>
  );
};
