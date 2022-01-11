import { ErrorRequestHandler } from "express";

// middleware checking for basic token authentication
const errorHandler : ErrorRequestHandler = async (err, req, res, next) => {
  console.error(err)
  res.status(500).json({
    message: 'Unexpected error'
  })
};

export default errorHandler;
