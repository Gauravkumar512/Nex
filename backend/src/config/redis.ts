import Redis from 'ioredis';

export const redisConnection = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

const redis = new Redis(redisConnection);

export default redis;
