import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// adding a post
const handleTebexWebhook = async (req: Request, res: Response, next: NextFunction) => {
  // get the data from req.body
  let body: any = req.body;

  console.log(body);

  if (!body || !body.id || !req.rawBody)
    return res.status(400).json({
      message: "Bad request",
    });

  // authenticate the incoming request
  const hmac = crypto.createHmac("sha256", process.env.TEBEX_KEY as string).setEncoding("utf-8");
  const retrievedSignature = req.get("X-Signature");
  let hash = crypto.createHash("sha256").update(req.rawBody).digest("hex");
  hmac.update(hash);
  const bodySignature = hmac.digest("hex");
  if (retrievedSignature !== bodySignature)
    return res.status(403).json({
      message: "Invalid signature",
    });

  // return response
  return res.status(200).json({
    id: body.id,
  });
};

export default { handleTebexWebhook };
