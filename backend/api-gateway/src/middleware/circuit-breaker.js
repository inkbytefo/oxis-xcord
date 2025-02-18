import CircuitBreaker from 'opossum';
import config from '../config.js';

const defaultOptions = {
  timeout: config.circuitBreaker.requestTimeout,
  errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
  resetTimeout: config.circuitBreaker.resetTimeout
};

export class ServiceCircuitBreaker {
  constructor(service) {
    this.breakers = new Map();
    this.service = service;
  }

  createBreaker(route) {
    const breaker = new CircuitBreaker(async (req) => {
      const response = await fetch(`${this.service}${route}`, {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response;
    }, defaultOptions);

    // Event handlers
    breaker.on('success', () => {
      console.log(`Circuit Breaker: Successful request to ${this.service}${route}`);
    });

    breaker.on('timeout', () => {
      console.error(`Circuit Breaker: Request to ${this.service}${route} timed out`);
    });

    breaker.on('reject', () => {
      console.error(`Circuit Breaker: Request to ${this.service}${route} rejected (Circuit open)`);
    });

    breaker.on('open', () => {
      console.warn(`Circuit Breaker: Circuit to ${this.service}${route} opened`);
    });

    breaker.on('close', () => {
      console.info(`Circuit Breaker: Circuit to ${this.service}${route} closed`);
    });

    breaker.on('halfOpen', () => {
      console.info(`Circuit Breaker: Circuit to ${this.service}${route} half-open`);
    });

    return breaker;
  }

  getBreaker(route) {
    if (!this.breakers.has(route)) {
      this.breakers.set(route, this.createBreaker(route));
    }
    return this.breakers.get(route);
  }

  // Middleware factory
  middleware(route) {
    return async (req, res, next) => {
      try {
        const breaker = this.getBreaker(route);
        const response = await breaker.fire(req);
        const data = await response.json();
        res.status(response.status).json(data);
      } catch (error) {
        if (error.code === 'EOPENBREAKER') {
          res.status(503).json({
            status: 'error',
            message: 'Service temporarily unavailable'
          });
        } else {
          next(error);
        }
      }
    };
  }
}

// Create circuit breakers for each service
export const circuitBreakers = {
  auth: new ServiceCircuitBreaker(config.SERVICES.AUTH.URL),
  messaging: new ServiceCircuitBreaker(config.SERVICES.MESSAGING.URL),
  voice: new ServiceCircuitBreaker(config.SERVICES.VOICE.URL),
  serverManagement: new ServiceCircuitBreaker(config.SERVICES.SERVER_MANAGEMENT.URL)
};

export const circuitBreaker = (serviceName, route) => {
  if (!circuitBreakers[serviceName]) {
    throw new Error(`Circuit breaker not configured for service: ${serviceName}`);
  }
  return circuitBreakers[serviceName].middleware(route);
};
