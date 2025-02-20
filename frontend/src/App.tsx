import { useState, useEffect } from 'react';
import { RegistrationForm } from './RegistrationForm';
import { LoginForm } from './LoginForm';
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme';
import Navigation from './Navigation';
import Card from './Card';
import InteractiveElement from './InteractiveElement';

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
      <ChakraProvider theme={theme}>
        <Navigation />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
          <Card title="Welcome">
            <h1 className="text-4xl font-bold text-green-600 mb-8">
              Hoş Geldiniz{user.username ? `, ${user.username}` : ''}!
            </h1>
            <InteractiveElement>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
              >
                Çıkış Yap
              </button>
            </InteractiveElement>
          </Card>
        </div>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider theme={theme}>
      <Navigation />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="w-full max-w-md">
          {showLogin ? (
            <>
              <Card title="Login">
                <LoginForm onLogin={handleLogin} />
              </Card>
              <p className="text-center mt-4 text-gray-600">
                Hesabınız yok mu?{' '}
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-blue-500 underline hover:text-blue-700 focus:outline-none"
                >
                  Kayıt Ol
                </button>
              </p>
            </>
          ) : (
            <>
              <Card title="Register">
                <RegistrationForm onSuccess={handleRegistrationSuccess} />
              </Card>
              <p className="text-center mt-4 text-gray-600">
                Zaten hesabınız var mı?{' '}
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-blue-500 underline hover:text-blue-700 focus:outline-none"
                >
                  Giriş Yap
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </ChakraProvider>
  );
}

export default App;
