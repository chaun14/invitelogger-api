import { Request, Response, NextFunction } from "express";

// middleware checking for basic token authentication
const internalTokenAuthentication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      const key = req.headers.authorization.slice(7);
      if (key === process.env.INTERNAL_API_KEY) {
        // store authentication information into request object
        next();
        return;
      } else {
        return res.status(401).json({
          message: "Invalid token",
        });
      }
    }

    // 401 if token not found or not provided
    res.status(401).json({
      message: "Please provide a token pls",
    });
  } catch (err) {
    next(err);
  }
};

export default internalTokenAuthentication;
