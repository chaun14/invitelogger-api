import { Request, Response, NextFunction } from "express";

/**
 * checkauth request handler to test token authentication
 * @param req
 * @param res
 * @param next
 * @returns Empty response with status code 200 if authenticated,
 */
const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  res.send({ message: "Welcome aboard! You are sucessfully authenticated." });
};

export default { checkAuth };
