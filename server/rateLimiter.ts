import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Creates an Express rate-limiting middleware.
 * @param windowMs Time frame in milliseconds (e.g. 5000ms = 5s)
 * @param maxRequests Maximum requests allowed within windowMs per IP / User
 */
export function createRateLimiter(windowMs: number = 5000, maxRequests: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userId = (req.headers["x-user-email"] as string) || (req.headers["x-user-id"] as string) || String(ip);
    const key = `${req.path}:${userId}`;

    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    store[key].count += 1;

    if (store[key].count > maxRequests) {
      const retryAfterSeconds = Math.ceil((store[key].resetTime - now) / 1000);
      return res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Please wait ${retryAfterSeconds} second(s) before trying again.`,
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
}
