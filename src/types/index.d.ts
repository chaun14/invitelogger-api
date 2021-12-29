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
