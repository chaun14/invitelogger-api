import { Request, Response, NextFunction } from "express";

import { Applications } from "@entity/dash/Applications.js";

import config from "@config";
import { dashDataSource } from "@config/orm";

const getToken = (
  authorization?: string,
  options: { withBearer: boolean } = { withBearer: true }
): string | null => {
  if (authorization) {
    if (!options.withBearer) {
      return authorization;
    }

    if (authorization.startsWith("Bearer ")) {
      return authorization.slice(7);
    }
  }

  return null;
};

export const internalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ message: "Authorization token is required" });
      return;
    }

    if (token !== config.internalApiKey) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const integrationAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ message: "Authorization token is required" });
      return;
    }

    if (token !== config.dcApiKey) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const voteAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getToken(req.headers.authorization, { withBearer: false });
    if (!token) {
      res.status(401).json({ message: "Authorization token is required" });
      return;
    }

    let key: string | undefined;

    switch (req.path) {
      case "/topgg":
        key = config.voteWebhooks.topGG;
        break;
      case "/dlist":
        key = config.voteWebhooks.dList;
        break;
      case "/vcodes":
        key = config.voteWebhooks.vCodes;
        break;
      case "/wumpus":
        key = config.voteWebhooks.wumpusStore;
        break;
    }

    if (token !== key) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const v1Auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ message: "Authorization token is required" });
      return;
    }

    const application = await dashDataSource.manager.findOne(Applications, { where: { token } });
    if (!application) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    req.authenticate = application;
    next();
  } catch (error) {
    next(error);
  }
};
