import axios, { AxiosResponse } from 'axios';
import { config } from '../config';
import { User } from '../models/User';
import { AuthenticationError } from '../utils/errors';

// Type declarations
interface OAuthProfile {
  id: string;
  email?: string;
  name?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  email_verified: boolean;
}

interface GithubUserInfo {
  id: number;
  login: string;
  name: string | null;
}

interface GithubEmailInfo {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

type OAuthProvider = 'google' | 'github';

class OAuthService {
  async #createOrUpdateUser(profile: OAuthProfile, provider: OAuthProvider): Promise<User> {
    const providerIdField = `${provider}Id` as keyof User;
    const email = profile.email?.toLowerCase();

    // Email zorunlu
    if (!email) {
      throw new AuthenticationError(
        'OAUTH_ERROR',
        'Email bilgisi alınamadı'
      );
    }

    // Önce provider ID ile kullanıcı ara
    let user = await User.findOne({
      where: { [providerIdField]: profile.id }
    });

    if (user) {
      // Kullanıcı varsa güncelle
      await user.update({
        email: email,
        [providerIdField]: profile.id
      });
      return user;
    }

    // Email ile kullanıcı ara
    user = await User.findOne({ where: { email } });

    if (user) {
      // Varolan kullanıcıya provider bağlantısı ekle
      await user.update({ [providerIdField]: profile.id });
      return user;
    }

    // Yeni kullanıcı oluştur
    return await User.create({
      email,
      username: this.#generateUsername(profile.name || email),
      [providerIdField]: profile.id,
      emailVerified: true, // OAuth ile gelen emailler doğrulanmış kabul edilir
      roles: ['user'],
      isActive: true,
      isSuspended: false,
      loginAttempts: 0,
      twoFactorEnabled: false,
      twoFactorBackupCodes: []
    });
  }

  #generateUsername(base: string): string {
    const cleaned = base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);
    const random = Math.random().toString(36).slice(2, 6);
    return `${cleaned}${random}`;
  }

  async handleGoogleAuth(code: string): Promise<User> {
    try {
      // Token al
      const tokenResponse: AxiosResponse<GoogleTokenResponse> = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: config.oauth.google.clientId,
          client_secret: config.oauth.google.clientSecret,
          redirect_uri: config.oauth.google.callbackUrl,
          grant_type: 'authorization_code'
        }
      );

      // Kullanıcı bilgilerini al
      const userResponse: AxiosResponse<GoogleUserInfo> = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`
          }
        }
      );

      const profile: OAuthProfile = {
        id: userResponse.data.sub,
        email: userResponse.data.email,
        name: userResponse.data.name
      };

      return await this.#createOrUpdateUser(profile, 'google');
    } catch (error) {
      throw new AuthenticationError(
        'GOOGLE_AUTH_ERROR',
        'Google ile giriş başarısız: ' + (error as Error).message
      );
    }
  }

  async handleGithubAuth(code: string): Promise<User> {
    try {
      // Token al
      const tokenResponse: AxiosResponse<GithubTokenResponse> = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          code,
          client_id: config.oauth.github.clientId,
          client_secret: config.oauth.github.clientSecret,
          redirect_uri: config.oauth.github.callbackUrl
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      // Kullanıcı bilgilerini al
      const userResponse: AxiosResponse<GithubUserInfo> = await axios.get(
        'https://api.github.com/user',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`
          }
        }
      );

      // Email bilgisini al
      const emailsResponse: AxiosResponse<GithubEmailInfo[]> = await axios.get(
        'https://api.github.com/user/emails',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`
          }
        }
      );

      const primaryEmail = emailsResponse.data.find(email => email.primary)?.email;

      const profile: OAuthProfile = {
        id: userResponse.data.id.toString(),
        email: primaryEmail,
        name: userResponse.data.login
      };

      return await this.#createOrUpdateUser(profile, 'github');
    } catch (error) {
      throw new AuthenticationError(
        'GITHUB_AUTH_ERROR',
        'Github ile giriş başarısız: ' + (error as Error).message
      );
    }
  }

  async unlinkProvider(userId: string, provider: OAuthProvider): Promise<User> {
    const providerIdField = `${provider}Id` as keyof User;
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // En az bir giriş yöntemi kalmalı
    const hasPassword = !!user.password;
    const connectedProviders = ['google', 'github'].filter(
      p => !!user[`${p}Id` as keyof User] && p !== provider
    );

    if (!hasPassword && connectedProviders.length === 0) {
      throw new Error('En az bir giriş yöntemi olmalı');
    }

    await user.update({ [providerIdField]: null });
    return user;
  }
}

export const oauthService = new OAuthService();