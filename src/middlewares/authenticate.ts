import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

import { Applications } from "@entity/dash/Applications.js";

import config from "@config";
import { dashDataSource } from "@config/orm";

export enum AuthenticateType {
  Payment,
  Integration,
  Email,
  Public,
  Vote,
}

const getToken = (
  authorization: string | undefined,
  withoutBearer: boolean = false
): string | null => {
  return authorization && (!withoutBearer || !authorization.startsWith("Bearer "))
    ? authorization.replace("Bearer ", "")
    : null;
};

const verifyToken = async (
  token: string | null,
  req: Request,
  authType: AuthenticateType
): Promise<boolean> => {
  if (!token) {
    return false;
  }

  switch (authType) {
    case AuthenticateType.Public:
      // eslint-disable-next-line no-case-declarations
      const application = await dashDataSource.manager.findOne(Applications, { where: { token } });
      if (application) {
        req.authenticate = application;
        return true;
      }
      break;
    case AuthenticateType.Email:
      return token === config.internalApiKey;
    case AuthenticateType.Payment:
      return (
        crypto.createHmac("sha256", token).update(req.rawBody).digest("hex") === config.tebexKey
      );
    case AuthenticateType.Integration:
      return token === config.dcApiKey;
    case AuthenticateType.Vote:
      return token === config.voteWebhooks[req.path.substring(1)];
  }

  return false;
};

const authenticate =
  (authType: AuthenticateType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenSource =
        authType === AuthenticateType.Payment ? req.get("X-Signature") : req.headers.authorization;
      const token = getToken(tokenSource, authType === AuthenticateType.Vote);

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
