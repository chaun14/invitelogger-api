import { Applications } from "../entities/dash/Applications";

declare module "http" {
  export interface IncomingMessage {
    rawBody: Buffer;
  }
}

declare namespace NodeJS {
  export interface ProcessEnv {
    TEBEX_KEY: string;
    TOPGG_VOTE_WEBHOOK: string;
  }
}

declare global {
  namespace Express {
    export interface Request {
      tokenAuth?: Applications;
    }
  }  
}