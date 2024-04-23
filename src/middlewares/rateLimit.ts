import { Request, Response, NextFunction } from "express";

import config from "@config";

const rateLimits = new Map<string, { count: number; startTime: number }>();

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip;

    if (!ip) {
      next();
      return;
    }

    const currentRequestTime = Date.now();

    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, { count: 1, startTime: currentRequestTime });
      next();
    } else {
      const requestData = rateLimits.get(ip)!;

      if (currentRequestTime > requestData.startTime + config.rateLimit.time) {
        rateLimits.set(ip, { count: 1, startTime: currentRequestTime });
        next();
      } else {
        if (requestData.count < config.rateLimit.max) {
          requestData.count++;
          next();
        } else {
          res.status(429).json({ message: "Too many requests, please try again later." });
        }
      }
    }
  } catch (error) {
    next(error);
  }
};

export default rateLimit;
