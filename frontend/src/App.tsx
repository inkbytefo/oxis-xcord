import { useState, useEffect } from 'react';
import './App.css';
import { RegistrationForm } from './RegistrationForm';
import { LoginForm } from './LoginForm';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  const handleRegistrationSuccess = () => {
    setShowLogin(true);
  };

  if (isAuthenticated) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (
      <div className="App">
        <h1 className="welcome-message">Hoş Geldiniz{user.username ? `, ${user.username}` : ''}!</h1>
        <button onClick={handleLogout} className="logout-button">
          Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="form-container">
        {showLogin ? (
          <>
            <LoginForm onLogin={handleLogin} />
            <p className="switch-form">
              Hesabınız yok mu?{' '}
              <button onClick={() => setShowLogin(false)} className="switch-button">
                Kayıt Ol
              </button>
            </p>
          </>
        ) : (
          <>
            <RegistrationForm onRegistrationSuccess={handleRegistrationSuccess} />
            <p className="switch-form">
              Zaten hesabınız var mı?{' '}
              <button onClick={() => setShowLogin(true)} className="switch-button">
                Giriş Yap
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
