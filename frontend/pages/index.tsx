import { useEffect, useState, lazy, Suspense } from 'react';
import { ChakraProvider, Spinner, Center } from '@chakra-ui/react';
import theme from '../src/theme';
import Navigation from '../src/Navigation';
import Card from '../src/Card';
import { AuthStoreContext, initializeStore } from '../src/store';

// Lazy load components for better performance
const ThemeSettings = lazy(() => import('../src/ThemeSettings'));
const InteractiveElement = lazy(() => import('../src/InteractiveElement'));
const RegistrationForm = lazy(() => 
  import('../src/RegistrationForm').then(module => ({ 
    default: module.RegistrationForm 
  }))
);
const LoginForm = lazy(() => 
  import('../src/LoginForm').then(module => ({ 
    default: module.LoginForm 
  }))
);

// Loading fallback component
const LoadingFallback = () => (
  <Center h="200px">
    <Spinner size="xl" color="neon.500" thickness="4px" speed="0.65s" />
  </Center>
);

// Create store outside component to avoid recreation
const store = initializeStore();

function Home() {
  const [showLogin, setShowLogin] = useState(true);
  const isAuthenticated = store((state) => state.isAuthenticated);
  const user = store((state) => state.user);
  const setIsAuthenticated = store((state) => state.setIsAuthenticated);
  const setUser = store((state) => state.setUser);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setIsAuthenticated(true);
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    }
  }, [setIsAuthenticated, setUser]);

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleRegistrationSuccess = () => {
    setShowLogin(true);
  };

  const logoutButtonClasses = [
    'w-full md:w-auto px-6 py-3',
    'bg-red-500 text-white rounded-lg',
    'hover:bg-red-600 focus:outline-none',
    'focus:ring-2 focus:ring-red-500 focus:ring-opacity-50',
    'transition-all duration-300 transform hover:scale-105'
  ].join(' ');

  return (
    <AuthStoreContext.Provider value={store}>
      <ChakraProvider theme={theme}>
        <Navigation />
        <Suspense fallback={<LoadingFallback />}>
          {isAuthenticated ? (
            <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
              <ThemeSettings />
              <Card title="Welcome" className="w-full max-w-4xl mx-auto mt-8">
                <h1 className="text-3xl md:text-4xl font-bold text-neon-500 mb-8 text-center">
                  Hoş Geldiniz{user?.username ? `, ${user.username}` : ''}!
                </h1>
                <InteractiveElement>
                  <button
                    onClick={handleLogout}
                    className={logoutButtonClasses}
                  >
                    Çıkış Yap
                  </button>
                </InteractiveElement>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
              <Card title={showLogin ? 'Giriş' : 'Kayıt Ol'} className="w-full max-w-md">
                {showLogin ? (
                  <LoginForm onLogin={handleLogin} />
                ) : (
                  <RegistrationForm onSuccess={handleRegistrationSuccess} />
                )}
                <button
                  onClick={() => setShowLogin(!showLogin)}
                  className="mt-4 text-neon-500 hover:text-neon-600 transition-colors duration-300"
                >
                  {showLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
                </button>
              </Card>
            </div>
          )}
        </Suspense>
      </ChakraProvider>
    </AuthStoreContext.Provider>
  );
}

export default Home;