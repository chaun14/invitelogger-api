import { Request, Response, NextFunction } from "express";

/**
 * Dummy request handler to test token authentication
 * @param req 
 * @param res 
 * @param next 
 * @returns Empty response with status code 200 if authenticated,
 *   and status code 500 if not.
 */
const handleDummy = async (req: Request, res: Response, next: NextFunction) => {
  if (req.tokenAuth) {
    console.log(`Token: ${req.tokenAuth.token}`);
    console.log(`Guild ID: ${req.tokenAuth.guild_id}`);
    res.end()
    return
  }
  // should never happen, because of tokenAuth middleware
  res.status(500).end()
};

export default { handleDummy };
