import { ErrorRequestHandler, Request, Response } from "express";

// middleware checking for basic token authentication
const errorHandler: ErrorRequestHandler = async (
  err,
  _req: Request,
  res: Response
): Promise<void> => {
  console.error(err);
  res.status(500).json({
    message: "Unexpected error",
  });
};

export default errorHandler;
