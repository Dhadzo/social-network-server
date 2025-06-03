import dotenv from 'dotenv';

dotenv.config();

export const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL,
  vercelClientUrl: process.env.VERCEL_CLIENT_URL
};
