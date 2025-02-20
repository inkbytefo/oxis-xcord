declare global {
  var loginAttempts: number;
  var loginFailures: number;
  var activeSessions: number;

  namespace Express {
    interface Request {
      user?: import('./index').TokenPayload;
    }
  }
}

export {};