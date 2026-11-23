import { io, Socket } from "socket.io-client";

import config from "@config";
import logger, { Level } from "@utils/logger.js";

type SocketFactory = (url: string, options: { reconnection: boolean }) => Socket;
type LogFunction = (level: Level, ...args: any[]) => void;

export type YggdrasilClientOptions = {
  url?: string;
  key?: string;
  socketFactory?: SocketFactory;
  log?: LogFunction;
};

export class YggdrasilClient {
  private socket?: Socket;
  private readonly url?: string;
  private readonly key?: string;
  private readonly socketFactory: SocketFactory;
  private readonly log: LogFunction;

  constructor(options: YggdrasilClientOptions = {}) {
    this.url = options.url;
    this.key = options.key;
    this.socketFactory = options.socketFactory ?? io;
    this.log = options.log ?? logger;
  }

  public get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  public get initialized(): boolean {
    return this.socket !== undefined;
  }

  public connect(): Socket | undefined {
    if (this.socket) return this.socket;

    if (!this.url || !this.key) {
      this.log(Level.WARN, "Yggdrasil is disabled: YGGDRASIL_URL or YGGDRASIL_KEY is missing");
      return undefined;
    }

    const socket = this.socketFactory(this.url, { reconnection: true });
    this.socket = socket;

    socket.on("connect", () => {
      this.log(Level.INFO, "Connected to Yggdrasil");
      socket.emit("welcome", { type: "api", key: this.key });
    });
    socket.on("disconnect", (reason) => this.log(Level.WARN, `Disconnected from Yggdrasil: ${reason}`));
    socket.on("connect_error", (error: Error) =>
      this.log(Level.ERROR, `Yggdrasil connection failed: ${error.message}`)
    );
    socket.on("clientError", (data: { msg?: string }) =>
      this.log(Level.ERROR, `Yggdrasil rejected the API client: ${data.msg ?? "unknown error"}`)
    );

    return socket;
  }

  public disconnect(): void {
    if (!this.socket) return;

    const socket = this.socket;
    this.socket = undefined;
    socket.removeAllListeners();
    socket.disconnect();
  }

  public clearGuildSettingsCache(guildID: string): void {
    this.emit("clearGuildSettings", { guildID });
  }

  public clearLeaderboardCache(guildID: string): void {
    this.emit("clearLeaderboardCache", { guildID });
  }

  private emit(event: string, data: { guildID: string }): void {
    if (!this.socket) {
      this.log(Level.WARN, `Cannot emit ${event}: Yggdrasil client is not initialized`);
      return;
    }

    this.socket.emit(event, data);
  }
}

export const yggdrasilClient = new YggdrasilClient(config.yggdrasil);
