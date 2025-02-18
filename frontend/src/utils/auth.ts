import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { encrypt, decrypt } from './encryption';
import { logger } from './logger';

interface TokenData {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthError extends Error {
  response?: {
    status: number;
    data: any;
  };
}

class AuthManager {
  private static instance: AuthManager;
  private refreshPromise: Promise<string> | null = null;
  private tokenData: TokenData | null = null;

  private constructor() {
    // Singleton instance
  }

  static getInstance(): AuthManager {
    if (!this.instance) {
      this.instance = new AuthManager();
    }
    return this.instance;
  }

  private async storeTokenData(data: TokenData): Promise<void> {
    try {
      const encryptedData = await encrypt(JSON.stringify(data));
      sessionStorage.setItem('auth_data', encryptedData);
      this.tokenData = data;
    } catch (error) {
      logger.error('Token depolama hatası:', error as Error);
      throw new Error('Token güvenli şekilde depolanamadı');
    }
  }

  private async getStoredTokenData(): Promise<TokenData | null> {
    try {
      const encryptedData = sessionStorage.getItem('auth_data');
      if (!encryptedData) return null;

      const decryptedData = await decrypt(encryptedData);
      return JSON.parse(decryptedData) as TokenData;
    } catch (error) {
      logger.error('Token okuma hatası:', error as Error);
      return null;
    }
  }

  private async refreshAuthToken(): Promise<string> {
    try {
      if (this.refreshPromise) {
        return await this.refreshPromise;
      }

      this.refreshPromise = (async () => {
        try {
          const storedData = await this.getStoredTokenData();
          if (!storedData?.refreshToken) {
            throw new Error('Refresh token bulunamadı');
          }

          const response = await axios.post<{ token: string; refreshToken: string; expiresIn: number }>(
            '/api/auth/refresh-token',
            { refreshToken: storedData.refreshToken }
          );

          const newTokenData: TokenData = {
            token: response.data.token,
            refreshToken: response.data.refreshToken,
            expiresAt: Date.now() + response.data.expiresIn * 1000
          };

          await this.storeTokenData(newTokenData);
          return newTokenData.token;
        } catch (error) {
          logger.error('Token yenileme hatası:', error as Error);
          throw error;
        } finally {
          this.refreshPromise = null;
        }
      })();

      return await this.refreshPromise;
    } catch (error) {
      logger.error('Token yenileme başarısız:', error as Error);
      this.logout();
      throw error;
    }
  }

  setupAxiosInterceptors(): void {
    axios.interceptors.request.use(
      async (config: AxiosRequestConfig) => {
        try {
          const storedData = await this.getStoredTokenData();
          if (!storedData) return config;

          if (storedData.expiresAt - Date.now() < 5 * 60 * 1000) {
            const newToken = await this.refreshAuthToken();
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${newToken}`;
          } else {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${storedData.token}`;
          }
        } catch (error) {
          logger.error('Request interceptor hatası:', error as Error);
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.refreshAuthToken();
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            logger.error('Token yenileme başarısız:', refreshError as Error);
            this.logout();
            throw refreshError;
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  async login(token: string, refreshToken: string, expiresIn: number): Promise<void> {
    const tokenData: TokenData = {
      token,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000
    };

    await this.storeTokenData(tokenData);
    this.setupAxiosInterceptors();
  }

  async logout(): Promise<void> {
    try {
      const storedData = await this.getStoredTokenData();
      if (storedData?.token) {
        await axios.post('/api/auth/logout', {
          token: storedData.token
        });
      }
    } catch (error) {
      logger.error('Logout hatası:', error as Error);
    } finally {
      sessionStorage.removeItem('auth_data');
      this.tokenData = null;
      window.location.href = '/login';
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const storedData = await this.getStoredTokenData();
      return !!storedData && storedData.expiresAt > Date.now();
    } catch (error) {
      logger.error('Auth kontrolü hatası:', error as Error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const storedData = await this.getStoredTokenData();
      return storedData?.token || null;
    } catch (error) {
      logger.error('Token alma hatası:', error as Error);
      return null;
    }
  }
}

export const authManager = AuthManager.getInstance();
export const setupAuth = () => authManager.setupAxiosInterceptors();