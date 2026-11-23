const { EventEmitter } = require("node:events");

jest.mock("@utils/logger.js", () => ({
  __esModule: true,
  default: jest.fn(),
  Level: { HTTP: 0, INFO: 1, WARN: 2, ERROR: 3 },
}));

const { Level } = require("@utils/logger.js");
const { YggdrasilClient } = require("../src/utils/yggdrasil");

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.outgoing = [];
    this.disconnectCalls = 0;
  }

  emit(event, data) {
    this.outgoing.push({ event, data });
    return true;
  }

  trigger(event, data) {
    return super.emit(event, data);
  }

  disconnect() {
    this.disconnectCalls++;
    this.connected = false;
    return this;
  }
}

const createClient = (overrides = {}) => {
  const socket = new FakeSocket();
  const socketFactory = jest.fn(() => socket);
  const log = jest.fn();
  const client = new YggdrasilClient({
    url: "https://yggdrasil.example",
    key: "api-secret",
    socketFactory,
    log,
    ...overrides,
  });
  return { client, socket, socketFactory, log };
};

describe("YggdrasilClient", () => {
  test.each([
    [{ key: undefined }, "missing key"],
    [{ url: undefined }, "missing URL"],
  ])("does not initialize when configuration has a %s", (overrides) => {
    const { client, socketFactory, log } = createClient(overrides);

    expect(client.connect()).toBeUndefined();
    expect(client.initialized).toBe(false);
    expect(client.connected).toBe(false);
    expect(socketFactory).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(Level.WARN, "Yggdrasil is disabled: YGGDRASIL_URL or YGGDRASIL_KEY is missing");
  });

  test("creates one reconnecting socket and keeps connect idempotent", () => {
    const { client, socket, socketFactory } = createClient();

    expect(client.connect()).toBe(socket);
    expect(client.connect()).toBe(socket);
    expect(socketFactory).toHaveBeenCalledTimes(1);
    expect(socketFactory).toHaveBeenCalledWith("https://yggdrasil.example", { reconnection: true });
    expect(client.initialized).toBe(true);
  });

  test("authenticates after every initial connection and reconnection", () => {
    const { client, socket, log } = createClient();
    client.connect();

    socket.connected = true;
    socket.trigger("connect");
    socket.trigger("disconnect", "transport close");
    socket.connected = false;
    socket.connected = true;
    socket.trigger("connect");

    expect(socket.outgoing).toEqual([
      { event: "welcome", data: { type: "api", key: "api-secret" } },
      { event: "welcome", data: { type: "api", key: "api-secret" } },
    ]);
    expect(log).toHaveBeenCalledWith(Level.INFO, "Connected to Yggdrasil");
    expect(log).toHaveBeenCalledWith(Level.WARN, "Disconnected from Yggdrasil: transport close");
    expect(client.connected).toBe(true);
  });

  test("emits both cache invalidation messages with the expected protocol", () => {
    const { client, socket } = createClient();
    client.connect();

    client.clearGuildSettingsCache("123456789012345678");
    client.clearLeaderboardCache("123456789012345678");

    expect(socket.outgoing).toEqual([
      { event: "clearGuildSettings", data: { guildID: "123456789012345678" } },
      { event: "clearLeaderboardCache", data: { guildID: "123456789012345678" } },
    ]);
  });

  test("does not silently drop an emission before initialization", () => {
    const { client, socket, log } = createClient();

    client.clearGuildSettingsCache("123456789012345678");
    client.clearLeaderboardCache("123456789012345678");

    expect(socket.outgoing).toEqual([]);
    expect(log).toHaveBeenNthCalledWith(
      1,
      Level.WARN,
      "Cannot emit clearGuildSettings: Yggdrasil client is not initialized"
    );
    expect(log).toHaveBeenNthCalledWith(
      2,
      Level.WARN,
      "Cannot emit clearLeaderboardCache: Yggdrasil client is not initialized"
    );
  });

  test("reports transport and authentication errors", () => {
    const { client, socket, log } = createClient();
    client.connect();

    socket.trigger("connect_error", new Error("connection refused"));
    socket.trigger("clientError", { msg: "Auth failed: Wrong key" });
    socket.trigger("clientError", {});

    expect(log).toHaveBeenCalledWith(Level.ERROR, "Yggdrasil connection failed: connection refused");
    expect(log).toHaveBeenCalledWith(Level.ERROR, "Yggdrasil rejected the API client: Auth failed: Wrong key");
    expect(log).toHaveBeenCalledWith(Level.ERROR, "Yggdrasil rejected the API client: unknown error");
  });

  test("disconnects cleanly, removes listeners and allows a fresh connection", () => {
    const firstSocket = new FakeSocket();
    const secondSocket = new FakeSocket();
    const socketFactory = jest.fn().mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);
    const client = new YggdrasilClient({
      url: "https://yggdrasil.example",
      key: "api-secret",
      socketFactory,
      log: jest.fn(),
    });

    client.connect();
    expect(firstSocket.listenerCount("connect")).toBe(1);
    client.disconnect();

    expect(firstSocket.disconnectCalls).toBe(1);
    expect(firstSocket.eventNames()).toEqual([]);
    expect(client.initialized).toBe(false);
    expect(client.connected).toBe(false);
    expect(client.connect()).toBe(secondSocket);
    expect(socketFactory).toHaveBeenCalledTimes(2);
  });

  test("disconnect is safe before initialization and after an earlier disconnect", () => {
    const { client, socket } = createClient();

    expect(() => client.disconnect()).not.toThrow();
    client.connect();
    client.disconnect();
    expect(() => client.disconnect()).not.toThrow();
    expect(socket.disconnectCalls).toBe(1);
  });
});
