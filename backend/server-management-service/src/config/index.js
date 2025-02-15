export const config = {
  port: process.env.PORT || 3003,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  environment: process.env.NODE_ENV || 'development'
};