import { NextFunction, Request, Response } from "express";

import config from "@config";

const rateLimits = new Map<string, { count: number; startTime: number }>();

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip;
    const token = req.headers.authorization;

    const currentRequestTime = Date.now();

    if (ip) {
      const ipKey = `ip:${ip}`;
      if (isLimited(ipKey, currentRequestTime, config.rateLimit.ip)) {
        res.status(429).json({ message: "Too many requests, please try again later." });
        return;
      }
    }

    if (token) {
      const tokenKey = `token:${token}`;
      if (isLimited(tokenKey, currentRequestTime, config.rateLimit.token)) {
        res.status(429).json({ message: "Too many requests, please try again later." });
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

const isLimited = (key: string, currentTime: number, limitConfig: { max: number; time: number }): boolean => {
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, startTime: currentTime });
    return false;
  }

  const requestData = rateLimits.get(key)!;
  if (currentTime > requestData.startTime + limitConfig.time) {
    rateLimits.set(key, { count: 1, startTime: currentTime });
    return false;
  }

  if (requestData.count < limitConfig.max) {
    requestData.count++;
    return false;
  }

  return true;
};

export default rateLimit;
