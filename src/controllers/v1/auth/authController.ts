import { Request, Response } from "express";

export const handleAuthCheck = async (_req: Request, res: Response) => {
  res.status(200).send({ message: "Welcome aboard! You are successfully authenticated" });
};
