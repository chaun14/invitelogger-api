declare module "http" {
  export interface IncomingMessage {
    rawBody: Buffer;
  }
}
