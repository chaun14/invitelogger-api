import { Applications } from "@entity/dash/Applications";

declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      PORT?: string;
      BOT_ID?: string;
      TOPGG_VOTE_WEBHOOK?: string;
      VCODES_VOTE_WEBHOOK?: string;
      DLIST_VOTE_WEBHOOK?: string;
      WUMPUSSTORE_VOTE_WEBHOOK?: string;
      TEBEX_API_KEY?: string;
      INTERNAL_API_KEY?: string;
      SENDGRID_API_KEY?: string;
      DC_API_KEY?: string;
      DASH_DB_HOST?: string;
      DASH_DB_PORT?: string;
      DASH_DB_USERNAME?: string;
      DASH_DB_PASSWORD?: string;
      DASH_DB_DATABASE?: string;
      BOT_DB_HOST?: string;
      BOT_DB_PORT?: string;
      BOT_DB_USERNAME?: string;
      BOT_DB_PASSWORD?: string;
      BOT_DB_DATABASE?: string;
    }
  }

  namespace Express {
    export interface Request {
      tokenAuth?: Applications;
      rawBody: Buffer;
    }
  }
}
