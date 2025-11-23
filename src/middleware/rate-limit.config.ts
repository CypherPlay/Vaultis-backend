
export interface RateLimitConfig {
  ttl: number;
  limit: number;
}

export const GUESS_SUBMIT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  ttl: 60 * 1000, // 1 minute
  limit: 5, // 5 requests per minute
};

export const BLOCKCHAIN_WEBHOOK_RATE_LIMIT_CONFIG: RateLimitConfig = {
  ttl: 60 * 1000, // 1 minute
  limit: 10, // 10 requests per minute
};
