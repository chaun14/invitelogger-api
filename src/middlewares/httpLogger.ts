import { NextFunction, Request, Response } from "express";

import logger, { Level } from "@utils/logger.js";

const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const { method, originalUrl } = req;
    const { statusCode, statusMessage } = res;
    const duration = Date.now() - start;
    const contentLength = res.get("Content-Length") || "0";

    const message = `${req.ip} - - "${method} ${originalUrl} HTTP/${req.httpVersion}" ${statusCode} ${statusMessage} ${contentLength} - ${duration} ms`;
    logger(Level.HTTP, message);
  });

  next();
};

export default httpLogger;
