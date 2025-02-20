import { RequestHandler } from 'express';

export type Middleware = RequestHandler;

export interface UserPayload {
  id: string;
  email: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}
