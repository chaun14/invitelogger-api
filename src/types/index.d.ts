import { Applications } from "../entity/dash/Applications.js";

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      PORT?: string;
      BOT_ID?: string;
      TOPGG_VOTE_WEBHOOK: string;
      VCODES_VOTE_WEBHOOK?: string;
      DLIST_VOTE_WEBHOOK?: string;
      WUMPUSSTORE_VOTE_WEBHOOK?: string;
      TEBEX_KEY?: string;
      INTERNAL_API_KEY?: string;
      SENDGRID_API_KEY?: string;
      DC_API_KEY?: string;
    }
  }

  namespace Express {
    interface Request {
      tokenAuth?: Applications;
      rawBody: Buffer;
    }
  }
}

export {};
