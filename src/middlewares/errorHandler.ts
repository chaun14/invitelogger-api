import { ErrorRequestHandler, Request, Response } from "express";

import logger, { Level } from "@utils/logger.js";
import config, { Environments } from "@config";

const errorHandler: ErrorRequestHandler = (err, _req: Request, res: Response) => {
  const statusCode = res.statusCode === 200 ? err.statusCode || 500 : res.statusCode;
  res.status(statusCode);

  logger(Level.Error, err);

  const body: { message: string; stack?: string } = {
    message: statusCode === 500 ? "Something went wrong on our end" : err.message,
  };

  if (config.environment === Environments.Development) {
    body.stack = err.stack;
  }

  res.json(body);
};

export default errorHandler;
