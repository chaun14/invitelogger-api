import { Request, Response } from "express";

/**
 * checkauth request handler to test token authentication
 * @param _req
 * @param res
 * @param next
 * @returns Empty response with status code 200 if authenticated,
 */
const checkAuth = async (_req: Request, res: Response): Promise<void> => {
  res.send({ message: "Welcome aboard! You are sucessfully authenticated." });
};

export default { checkAuth };
