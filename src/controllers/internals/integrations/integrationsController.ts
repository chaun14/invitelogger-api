import { Request, Response } from "express";

export const handleDoubleCounter = async (_req: Request, res: Response) => {
  res.status(200).json({});
};
