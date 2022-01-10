import { Request, Response, NextFunction } from "express";
import { Applications } from "../entities/dash/Applications";
import { getConnection } from "typeorm";

// middleware checking for basic token authentication
const tokenAuthentication = async (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {

    const application = await getConnection('dash').manager.findOne(Applications, {
      where: { token: req.headers.authorization.slice(7) }
    })

    if (application) {
      // store authentication information into request object
      req.tokenAuth = application
      next();
      return;  
    }
  }
  
  // 401 if token not found or not provided
  res.status(401).json({
    message: "Invalid token"
  });
};

export default tokenAuthentication;
