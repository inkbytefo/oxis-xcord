import axios from 'axios';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { AuthenticationError } from '../utils/errors.js';

class OAuthService {
  async #createOrUpdateUser(profile, provider) {
    const providerIdField = `${provider}Id`;
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
      emailVerified: true // OAuth ile gelen emailler doğrulanmış kabul edilir
    });
  }

  #generateUsername(base) {
    const cleaned = base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);
    const random = Math.random().toString(36).slice(2, 6);
    return `${cleaned}${random}`;
  }

  async handleGoogleAuth(code) {
    try {
      // Token al
      const tokenResponse = await axios.post(
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
      const userResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`
          }
        }
      );

      const profile = {
        id: userResponse.data.sub,
        email: userResponse.data.email,
        name: userResponse.data.name
      };

      return await this.#createOrUpdateUser(profile, 'google');
    } catch (error) {
      throw new AuthenticationError(
        'GOOGLE_AUTH_ERROR',
        'Google ile giriş başarısız: ' + error.message
      );
    }
  }

  async handleGithubAuth(code) {
    try {
      // Token al
      const tokenResponse = await axios.post(
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
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      });

      // Email bilgisini al
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      });

      const primaryEmail = emailsResponse.data.find(email => email.primary)?.email;

      const profile = {
        id: userResponse.data.id.toString(),
        email: primaryEmail,
        name: userResponse.data.login
      };

      return await this.#createOrUpdateUser(profile, 'github');
    } catch (error) {
      throw new AuthenticationError(
        'GITHUB_AUTH_ERROR',
        'Github ile giriş başarısız: ' + error.message
      );
    }
  }

  // OAuth bağlantısını kaldır
  async unlinkProvider(userId, provider) {
    const providerIdField = `${provider}Id`;
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // En az bir giriş yöntemi kalmalı
    const hasPassword = !!user.password;
    const connectedProviders = ['google', 'github'].filter(
      p => !!user[`${p}Id`] && p !== provider
    );

    if (!hasPassword && connectedProviders.length === 0) {
      throw new Error('En az bir giriş yöntemi olmalı');
    }

    await user.update({ [providerIdField]: null });
    return user;
  }
}

export const oauthService = new OAuthService();