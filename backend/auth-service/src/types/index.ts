import { Request } from 'express';
import { QueryResult, QueryResultRow } from 'pg';

export interface User extends QueryResultRow {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  google_id?: string;
  github_id?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface TokenPayload {
  id: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Express'in Request tipini genişlet
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export interface ValidationRule {
  exists?: boolean;
  isLength?: {
    min?: number;
    max?: number;
  };
  matches?: RegExp;
  isEmail?: boolean;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ServiceError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

export interface OAuthProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  provider: 'google' | 'github';
}

export interface Config {
  server: {
    port: number;
    cors: {
      origin: string[];
      methods: string[];
    };
  };
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiration: string;
    refreshTokenExpiration: string;
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
  redis: {
    url: string;
    prefix: string;
  };
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    github: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
}

export type { QueryResult };