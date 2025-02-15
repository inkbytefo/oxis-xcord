import { useState } from 'react';
import './App.css';
import { RegistrationForm } from './RegistrationForm';
import { LoginForm } from './LoginForm';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const handleLogin = (token: string) => {
    setIsAuthenticated(true);
  };

  if (isAuthenticated) {
    return (
      <div className="App">
        <h1>Hoş Geldiniz!</h1>
        <button onClick={() => {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }}>
          Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      {showLogin ? (
        <>
          <LoginForm onLogin={handleLogin} />
          <p className="switch-form">
            Hesabınız yok mu?{' '}
            <button onClick={() => setShowLogin(false)}>
              Kayıt Ol
            </button>
          </p>
        </>
      ) : (
        <>
          <RegistrationForm />
          <p className="switch-form">
            Zaten hesabınız var mı?{' '}
            <button onClick={() => setShowLogin(true)}>
              Giriş Yap
            </button>
          </p>
        </>
      )}
    </div>
  );
}

export default App;
