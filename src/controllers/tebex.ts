import { Request, Response, NextFunction } from "express";

// adding a post
const handleTebexWebhook = async (req: Request, res: Response, next: NextFunction) => {
  // get the data from req.body
  let body: any = req.body;

  console.log(body);

  if (!body || !body.id)
    return res.status(400).json({
      message: "Bad request",
    });

  // return response
  return res.status(200).json({
    id: body.id,
  });
};

export default { handleTebexWebhook };
