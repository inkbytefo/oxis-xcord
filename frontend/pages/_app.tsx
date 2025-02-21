import type { AppProps } from 'next/app';
import useAuthStore from '../src/store';
import { createContext, useMemo } from 'react';

export const AuthStoreContext = createContext(null);

function App({ Component, pageProps }: AppProps) {
  const store = useMemo(useAuthStore, []);

  return (
    <AuthStoreContext.Provider value={store}>
      <Component {...pageProps} />
    </AuthStoreContext.Provider>
  );
}

export default App;
