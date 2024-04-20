import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

import { Applications } from "@entity/dash/Applications.js";

import config from "@config";
import { dashDataSource } from "@config/orm";

export enum AuthenticateType {
  PAYMENT,
  INTEGRATION,
  EMAIL,
  PUBLIC,
  VOTE,
}

const getToken = (authorization: string | undefined, withoutBearer: boolean = false): string | null => {
  return authorization && (!withoutBearer || !authorization.startsWith("Bearer "))
    ? authorization.replace("Bearer ", "")
    : null;
};

const verifyToken = async (token: string | null, req: Request, authType: AuthenticateType): Promise<boolean> => {
  if (!token) {
    return false;
  }

  switch (authType) {
    case AuthenticateType.PUBLIC:
      // eslint-disable-next-line no-case-declarations
      const application = await dashDataSource.manager.findOne(Applications, { where: { token } });
      if (application) {
        req.authenticate = application;
        return true;
      }
      break;
    case AuthenticateType.EMAIL:
      return token === config.internalApiKey;
    case AuthenticateType.PAYMENT:
      return crypto.createHmac("sha256", token).update(req.rawBody).digest("hex") === config.tebexKey;
    case AuthenticateType.INTEGRATION:
      return token === config.dcApiKey;
    case AuthenticateType.VOTE:
      return token === config.voteWebhooks[req.path.substring(1)];
  }

  return false;
};

const authenticate = (authType: AuthenticateType) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenSource = authType === AuthenticateType.PAYMENT ? req.get("X-Signature") : req.headers.authorization;
    const token = getToken(tokenSource, authType === AuthenticateType.VOTE);

    if (await verifyToken(token, req, authType)) {
      next();
    } else {
      res.status(401).json({ message: "Invalid or missing authorization token" });
    }
  } catch (error) {
    next(error);
  }
};

export default authenticate;
