
export interface RateLimitConfig {
  windowMs: number;
  limit: number;
}

export const GUESS_SUBMIT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  limit: 5, // 5 requests per minute
};
