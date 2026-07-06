require("ts-node/register/transpile-only");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const typeorm = require("typeorm");

const mockSetApiKey = jest.fn();
const mockSendMail = jest.fn(() => Promise.resolve());

jest.mock("morgan", () => () => (_req, _res, next) => next());
jest.mock("@sendgrid/mail", () => ({
  setApiKey: mockSetApiKey,
  send: mockSendMail,
}));

const db = {
  queues: {},
  calls: [],
};

function resetDb() {
  db.queues = {};
  db.calls = [];
}

function enqueue(connectionName, method, values) {
  db.queues[`${connectionName}.${method}`] = values.slice();
}

function nextValue(connectionName, method) {
  const key = `${connectionName}.${method}`;
  const queue = db.queues[key] || [];
  if (!queue.length) return Promise.resolve(method === "find" ? [] : undefined);
  const value = queue.shift();
  return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
}

function fakeConnection(connectionName) {
  return {
    manager: {
      findOne: (entity, options) => {
        db.calls.push({ connectionName, method: "findOne", entity: entity && entity.name, options });
        return nextValue(connectionName, "findOne");
      },
      find: (entity, options) => {
        db.calls.push({ connectionName, method: "find", entity: entity && entity.name, options });
        return nextValue(connectionName, "find");
      },
      insert: (entity, data) => {
        db.calls.push({ connectionName, method: "insert", entity: entity && entity.name, data });
        return nextValue(connectionName, "insert").then((value) => value || { identifiers: [{ id: 1 }] });
      },
      update: (entity, criteria, data) => {
        db.calls.push({ connectionName, method: "update", entity: entity && entity.name, criteria, data });
        return nextValue(connectionName, "update").then((value) => value || {});
      },
      save: (data) => {
        db.calls.push({ connectionName, method: "save", data });
        return nextValue(connectionName, "save").then((value) => value || data);
      },
    },
  };
}

typeorm.getConnection = fakeConnection;
typeorm.getConnectionManager().get = fakeConnection;

const defaultEnv = {
  ENVIRONNEMENT: "test",
  TOPGG_VOTE_WEBHOOK: "topgg-secret",
  VCODES_VOTE_WEBHOOK: "vcodes-secret",
  DLIST_VOTE_WEBHOOK: "dlist-secret",
  WUMPUSSTORE_VOTE_WEBHOOK: "wumpus-secret",
  INTERNAL_API_KEY: "internal-secret",
  DC_API_KEY: "dc-secret",
  BOT_ID: "499595256270946326",
  TEBEX_KEY: "tebex-secret",
  SENDGRID_API_KEY: "sendgrid-secret",
};

Object.assign(process.env, defaultEnv);

const { createApp } = require("../src/server");
const { removeFakeReason, fakeTypes } = require("../src/controllers/integrations/doubleCounter");

function auth(token = "valid-token") {
  return `Bearer ${token}`;
}

function authenticatedToken(tokenAuth = { guild_id: "guild-1", bot_id: "bot-1" }) {
  enqueue("dash", "findOne", [tokenAuth]);
}

function tebexSignature(rawBody) {
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  return crypto.createHmac("sha256", process.env.TEBEX_KEY).update(bodyHash).digest("hex");
}

function signedTebexPost(body) {
  const rawBody = JSON.stringify(body);
  return request(createApp()).post("/payments").set("X-Signature", tebexSignature(rawBody)).set("Content-Type", "application/json").send(rawBody);
}

function paymentSubject(overrides = {}) {
  return {
    transaction_id: "txn-1",
    customer: {
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      ip: "127.0.0.1",
      username: { id: "discord-user-1", username: "Ada" },
    },
    recurring_payment_reference: null,
    payment_sequence: "oneoff",
    products: [{ id: 101, quantity: 1, name: "Gold monthly" }],
    price: { amount: 9.99, currency: "EUR" },
    created_at: "2026-01-01T00:00:00Z",
    status: { id: 1, description: "Complete" },
    ...overrides,
  };
}

function paymentWebhook(type, subjectOverrides = {}) {
  return {
    id: `webhook-${type}`,
    type,
    date: "2026-01-01T00:00:00Z",
    subject: paymentSubject(subjectOverrides),
  };
}

function recurringWebhook(type, overrides = {}) {
  const lastPayment = paymentSubject({
    transaction_id: "txn-sub-1",
    recurring_payment_reference: "sub-1",
    products: [{ id: 101, quantity: 1, name: "Gold monthly" }],
  });

  return {
    id: `webhook-${type}`,
    type,
    date: "2026-01-01T00:00:00Z",
    subject: {
      reference: "sub-1",
      created_at: "2026-01-01T00:00:00Z",
      next_payment_at: "2026-02-15T00:00:00Z",
      status: { id: 1, description: "Active" },
      initial_payment: lastPayment,
      last_payment: lastPayment,
      price: { amount: 9.99, currency: "EUR" },
      fail_count: 0,
      cancelled_at: null,
      cancel_reason: null,
      ...overrides,
    },
  };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

beforeEach(() => {
  Object.assign(process.env, defaultEnv);
  resetDb();
  mockSetApiKey.mockClear();
  mockSendMail.mockClear();
});

describe("application shell", () => {
  it("returns the public v1 landing payload without authentication", async () => {
    const response = await request(createApp()).get("/v1").expect(200);

    expect(response.body).toEqual({
      message: "Welcome to inviteLogger api. Find our documentation here: https://developers.invitelogger.me",
    });
  });

  it("redirects the root path to /v1", async () => {
    const response = await request(createApp()).get("/").expect(302);

    expect(response.headers.location).toBe("/v1");
  });

  it("sets CORS headers and short-circuits OPTIONS requests", async () => {
    const response = await request(createApp()).options("/v1/checkauth").expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.headers["access-control-allow-headers"]).toBe("origin, X-Requested-With,Content-Type,Accept, Authorization");
    expect(response.headers["access-control-allow-methods"]).toBe("GET PATCH DELETE POST");
  });

  it("returns the stable 404 contract for unknown routes", async () => {
    const response = await request(createApp()).get("/unknown").expect(404);

    expect(response.body).toEqual({ message: "not found" });
  });
});

describe("v1 token authentication", () => {
  it("rejects a missing bearer token", async () => {
    const response = await request(createApp()).get("/v1/checkauth").expect(401);

    expect(response.body).toEqual({ message: "Invalid token" });
    expect(db.calls).toHaveLength(0);
  });

  it("rejects a non-bearer Authorization header", async () => {
    const response = await request(createApp()).get("/v1/checkauth").set("Authorization", "Basic abc").expect(401);

    expect(response.body).toEqual({ message: "Invalid token" });
    expect(db.calls).toHaveLength(0);
  });

  it("rejects an unknown bearer token after looking it up in the dashboard database", async () => {
    enqueue("dash", "findOne", [undefined]);

    const response = await request(createApp()).get("/v1/checkauth").set("Authorization", auth("bad-token")).expect(401);

    expect(response.body).toEqual({ message: "Invalid token" });
    expect(db.calls[0]).toMatchObject({ connectionName: "dash", method: "findOne", entity: "Applications", options: { where: { token: "bad-token" } } });
  });

  it("confirms a valid token and stores the auth context on the request", async () => {
    authenticatedToken();

    const response = await request(createApp()).get("/v1/checkauth").set("Authorization", auth()).expect(200);

    expect(response.body).toEqual({ message: "Welcome aboard! You are sucessfully authenticated." });
    expect(db.calls[0].options).toEqual({ where: { token: "valid-token" } });
  });

  it("routes token lookup failures through the global error handler", async () => {
    enqueue("dash", "findOne", [new Error("database down")]);

    const response = await request(createApp()).get("/v1/checkauth").set("Authorization", auth()).expect(500);

    expect(response.body).toEqual({ message: "Unexpected error" });
  });
});

describe("invite endpoints", () => {
  it("validates required parameters for /v1/invites/user", async () => {
    authenticatedToken();

    const response = await request(createApp()).get("/v1/invites/user").set("Authorization", auth()).send({ guild_id: "guild-1" }).expect(400);

    expect(response.body).toEqual({ message: "Missing parameter" });
  });

  it("forbids /v1/invites/user requests outside the authenticated guild or bot", async () => {
    authenticatedToken();

    const response = await request(createApp()).get("/v1/invites/user").set("Authorization", auth()).send({ guild_id: "guild-2", bot_id: "bot-1", inviter_id: "user-1" }).expect(403);

    expect(response.body).toEqual({ message: "Access forbidden" });
  });

  it("calculates user invite totals, leaves, fake joins, real joins, and bonus invites", async () => {
    authenticatedToken();
    enqueue("bot", "find", [
      [{ invalidated: null }, { invalidated: "fake" }, { invalidated: "young" }, { invalidated: "newfake" }, { invalidated: "self" }, { invalidated: "leave" }, { invalidated: "unknow" }],
      [{ amount: "2" }, { amount: "3" }],
    ]);

    const response = await request(createApp()).get("/v1/invites/user").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-1", inviter_id: "user-1" }).expect(200);

    expect(response.body).toEqual({ total: 12, leaves: 1, fake: 3, bonus: 5, real: 7 });
    expect(db.calls[1].options).toEqual({ where: { guild_id: "guild-1", bot_id: "bot-1", inviter_id: "user-1", cleared: false } });
    expect(db.calls[2].options).toEqual({ where: { guild_id: "guild-1", bot_id: "bot-1", member_id: "user-1", cleared: false } });
  });

  it("returns zeroed user invite totals when no joins or bonuses exist", async () => {
    authenticatedToken();
    enqueue("bot", "find", [[], []]);

    const response = await request(createApp()).get("/v1/invites/user").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-1", inviter_id: "user-1" }).expect(200);

    expect(response.body).toEqual({ total: 0, leaves: 0, fake: 0, bonus: 0, real: 0 });
  });

  it("validates required parameters for /v1/invites/code", async () => {
    authenticatedToken();

    const response = await request(createApp()).get("/v1/invites/code").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-1" }).expect(400);

    expect(response.body).toEqual({ message: "Missing parameter" });
  });

  it("forbids /v1/invites/code requests outside the authenticated guild or bot", async () => {
    authenticatedToken();

    const response = await request(createApp()).get("/v1/invites/code").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-2", invite_code: "abc" }).expect(403);

    expect(response.body).toEqual({ message: "Access forbidden" });
  });

  it("maps joins for one invite code to the public response contract", async () => {
    authenticatedToken();
    const createdAt = "2026-01-01T00:00:00.000Z";
    const updatedAt = "2026-01-02T00:00:00.000Z";
    enqueue("bot", "find", [
      [
        { createdAt, updatedAt, member_id: "member-1", invalidated: null, cleared: false },
        { createdAt, updatedAt, member_id: "member-2", invalidated: "leave", cleared: true },
        { createdAt, updatedAt, member_id: "member-3", invalidated: "young", cleared: false },
      ],
    ]);

    const response = await request(createApp()).get("/v1/invites/code").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-1", invite_code: "abc" }).expect(200);

    expect(response.body).toEqual([
      { created_at: createdAt, updated_at: updatedAt, member_id: "member-1", fake: false, left: false, cleared: false },
      { created_at: createdAt, updated_at: updatedAt, member_id: "member-2", fake: false, left: true, cleared: true },
      { created_at: createdAt, updated_at: updatedAt, member_id: "member-3", fake: true, left: false, cleared: false },
    ]);
    expect(db.calls[1].options).toEqual({ where: { guild_id: "guild-1", bot_id: "bot-1", code: "abc" } });
  });

  it("returns an empty array when an invite code has no joins", async () => {
    authenticatedToken();
    enqueue("bot", "find", [[]]);

    const response = await request(createApp()).get("/v1/invites/code").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-1", invite_code: "abc" }).expect(200);

    expect(response.body).toEqual([]);
  });

  it("routes user invite repository failures through the global error handler", async () => {
    authenticatedToken();
    enqueue("bot", "find", [new Error("join lookup failed")]);

    const response = await request(createApp()).get("/v1/invites/user").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-1", inviter_id: "user-1" }).expect(500);

    expect(response.body).toEqual({ message: "Unexpected error" });
  });

  it("routes invite code repository failures through the global error handler", async () => {
    authenticatedToken();
    enqueue("bot", "find", [new Error("code lookup failed")]);

    const response = await request(createApp()).get("/v1/invites/code").set("Authorization", auth()).send({ guild_id: "guild-1", bot_id: "bot-1", invite_code: "abc" }).expect(500);

    expect(response.body).toEqual({ message: "Unexpected error" });
  });
});

describe("vote webhooks", () => {
  it("validates top.gg authorization and payload handling", async () => {
    await request(createApp()).post("/votes/topgg").send({ user: "u" }).expect(400, { message: "You didn't provide an 'Authorization' header!" });
    await request(createApp()).post("/votes/topgg").set("Authorization", "wrong").send({ user: "u" }).expect(403, { message: "You didn't provide the correct authorization key!" });

    await request(createApp()).post("/votes/topgg").set("Authorization", "topgg-secret").send({ type: "test", user: "u", bot: "b" }).expect(200, { message: "Vote received!" });
    expect(db.calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("persists a real top.gg vote", async () => {
    await request(createApp()).post("/votes/topgg").set("Authorization", "topgg-secret").send({ user: "user-1", bot: "bot-1", isWeekend: true }).expect(200);

    expect(db.calls.at(-1)).toMatchObject({ connectionName: "dash", method: "insert", entity: "Votes", data: { user_id: "user-1", bot_id: "bot-1", weekend: true } });
  });

  it("still acknowledges top.gg votes when vote persistence fails", async () => {
    enqueue("dash", "insert", [new Error("insert failed")]);

    await request(createApp()).post("/votes/topgg").set("Authorization", "topgg-secret").send({ user: "user-1", bot: "bot-1", isWeekend: false }).expect(200, { message: "Vote received!" });
    await flushAsyncWork();

    expect(db.calls.at(-1)).toMatchObject({ method: "insert", entity: "Votes" });
  });

  it("validates vcodes authorization and ignores non-vote or test events", async () => {
    await request(createApp()).post("/votes/vcodes").send({}).expect(400, { message: "You didn't provide an 'Authorization' header!" });
    await request(createApp()).post("/votes/vcodes").set("Authorization", "wrong").send({}).expect(403, { message: "You didn't provide the correct authorization key!" });

    await request(createApp()).post("/votes/vcodes").set("Authorization", "vcodes-secret").send({ trigger: "ping", user: { id: "u", tag: "U" } }).expect(200);
    await request(createApp()).post("/votes/vcodes").set("Authorization", "vcodes-secret").send({ trigger: "vote", test: true, user: { id: "u", tag: "U" } }).expect(200);
    expect(db.calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("persists a real vcodes vote with the default bot id", async () => {
    await request(createApp()).post("/votes/vcodes").set("Authorization", "vcodes-secret").send({ trigger: "vote", user: { id: "user-1", tag: "User#0001" } }).expect(200);

    expect(db.calls.at(-1).data).toEqual({ user_id: "user-1", bot_id: "499595256270946326", weekend: false, platform: "vcodes" });
  });

  it("still acknowledges vcodes votes when vote persistence fails", async () => {
    enqueue("dash", "insert", [new Error("insert failed")]);

    await request(createApp()).post("/votes/vcodes").set("Authorization", "vcodes-secret").send({ trigger: "vote", user: { id: "user-1", tag: "User#0001" } }).expect(200, { message: "Vote received thanks !" });
    await flushAsyncWork();

    expect(db.calls.at(-1)).toMatchObject({ method: "insert", entity: "Votes" });
  });

  it("rejects invalid dlist JWT payloads and ignores dlist test votes", async () => {
    await request(createApp()).post("/votes/dlist").type("text").send("invalid.jwt").expect(403, { message: "You didn't provide the correct authorization key!" });

    const token = jwt.sign({ bot_id: "bot-1", user_id: "user-1", is_test: true }, process.env.DLIST_VOTE_WEBHOOK);
    await request(createApp()).post("/votes/dlist").type("text").send(token).expect(200, { message: "Test vote received thanks !" });
    expect(db.calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("persists a real dlist vote", async () => {
    const token = jwt.sign({ bot_id: "bot-2", user_id: "user-2", is_test: false }, process.env.DLIST_VOTE_WEBHOOK);

    await request(createApp()).post("/votes/dlist").type("text").send(token).expect(200, { message: "Vote received thanks !" });

    expect(db.calls.at(-1).data).toEqual({ user_id: "user-2", bot_id: "bot-2", weekend: false, platform: "dlist" });
  });

  it("still acknowledges dlist votes when vote persistence fails", async () => {
    enqueue("dash", "insert", [new Error("insert failed")]);
    const token = jwt.sign({ bot_id: "bot-2", user_id: "user-2", is_test: false }, process.env.DLIST_VOTE_WEBHOOK);

    await request(createApp()).post("/votes/dlist").type("text").send(token).expect(200, { message: "Vote received thanks !" });

    expect(db.calls.at(-1)).toMatchObject({ method: "insert", entity: "Votes" });
  });

  it("validates wumpus authorization, test votes, and bot id", async () => {
    await request(createApp()).post("/votes/wumpus").send({}).expect(400, { message: "You didn't provide an 'Authorization' header!" });
    await request(createApp()).post("/votes/wumpus").set("Authorization", "wrong").send({}).expect(403, { message: "You didn't provide the correct authorization key!" });
    await request(createApp()).post("/votes/wumpus").set("Authorization", "wumpus-secret").send({ webhookTest: true }).expect(200, { message: "Test vote received thanks !" });
    await request(createApp()).post("/votes/wumpus").set("Authorization", "wumpus-secret").send({ webhookTest: false, userId: "user-3", botId: "other-bot" }).expect(400, { message: "You didn't provide the right bot vote!" });

    expect(db.calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("persists a real wumpus vote", async () => {
    await request(createApp()).post("/votes/wumpus").set("Authorization", "wumpus-secret").send({ webhookTest: false, userId: "user-3", botId: "499595256270946326" }).expect(200);

    expect(db.calls.at(-1).data).toEqual({ user_id: "user-3", bot_id: "499595256270946326", weekend: false, platform: "wumpus.store" });
  });

  it("still acknowledges wumpus votes when vote persistence fails", async () => {
    enqueue("dash", "insert", [new Error("insert failed")]);

    await request(createApp()).post("/votes/wumpus").set("Authorization", "wumpus-secret").send({ webhookTest: false, userId: "user-3", botId: "499595256270946326" }).expect(200, { message: "Vote received thanks !" });

    expect(db.calls.at(-1)).toMatchObject({ method: "insert", entity: "Votes" });
  });
});

describe("internal email endpoint", () => {
  it("requires a valid internal bearer token", async () => {
    await request(createApp()).post("/internal/mail").send({}).expect(401, { message: "Please provide a token pls" });
    await request(createApp()).post("/internal/mail").set("Authorization", "Basic abc").send({}).expect(401, { message: "Please provide a token pls" });
    await request(createApp()).post("/internal/mail").set("Authorization", auth("wrong")).send({}).expect(401, { message: "Invalid token" });
  });

  it("validates email, subject, and message fields", async () => {
    await request(createApp()).post("/internal/mail").set("Authorization", auth("internal-secret")).send({}).expect(400, { message: "You didn't provide an email" });
    await request(createApp()).post("/internal/mail").set("Authorization", auth("internal-secret")).send({ email: "a@example.com" }).expect(400, { message: "You didn't provide a subject" });
    await request(createApp()).post("/internal/mail").set("Authorization", auth("internal-secret")).send({ email: "a@example.com", subject: "Hello" }).expect(400, { message: "You didn't provide a message" });
  });

  it("sends an email with default template options", async () => {
    await request(createApp()).post("/internal/mail").set("Authorization", auth("internal-secret")).send({ email: "a@example.com", subject: "Hello", message: "World" }).expect(200, { message: "Email sent" });

    expect(mockSetApiKey).toHaveBeenCalledWith("sendgrid-secret");
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "a@example.com",
      dynamic_template_data: expect.objectContaining({
        subject: "Hello",
        title: "Hello",
        button_url: "https://gold.invitelogger.me",
        button_txt: "Go to the gold dashboard",
        message: "World",
      }),
    }));
  });

  it("sends an email with custom template options", async () => {
    await request(createApp()).post("/internal/mail").set("Authorization", auth("internal-secret")).send({
      email: "a@example.com",
      subject: "Hello",
      message: "World",
      options: { title: "Custom title", button_url: "https://example.com", button_txt: "Open" },
    }).expect(200, { message: "Email sent" });

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      dynamic_template_data: expect.objectContaining({
        title: "Custom title",
        button_url: "https://example.com",
        button_txt: "Open",
      }),
    }));
  });

  it("keeps the endpoint response successful even when SendGrid rejects asynchronously", async () => {
    mockSendMail.mockImplementationOnce(() => Promise.reject(new Error("send failed")));

    await request(createApp()).post("/internal/mail").set("Authorization", auth("internal-secret")).send({ email: "a@example.com", subject: "Hello", message: "World" }).expect(200, { message: "Email sent" });
    await flushAsyncWork();

    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});

describe("Double Counter integration", () => {
  it("requires a valid Double Counter bearer token", async () => {
    await request(createApp()).post("/integrations/dc/verification").send({ guild_id: "guild-1", member_id: "member-1" }).expect(401, { message: "Please provide a token pls" });
    await request(createApp()).post("/integrations/dc/verification").set("Authorization", "Basic abc").send({ guild_id: "guild-1", member_id: "member-1" }).expect(401, { message: "Please provide a token pls" });
    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("wrong")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(401, { message: "Invalid token" });
  });

  it("validates required verification parameters", async () => {
    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1" }).expect(400, { message: "Missing parameter" });
  });

  it("rejects unknown guilds and disabled integrations", async () => {
    enqueue("prodbot", "findOne", [undefined]);
    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(404, { message: "Unknown guild" });

    resetDb();
    enqueue("prodbot", "findOne", [{ integrations: { dc: { enabled: false } } }]);
    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(403, { message: "Integration not enabled" });

    resetDb();
    enqueue("prodbot", "findOne", [{ integrations: {} }]);
    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(403, { message: "Integration not enabled" });
  });

  it("returns 404 when no pending fake verification exists", async () => {
    enqueue("prodbot", "findOne", [{ integrations: { dc: { enabled: true } } }, undefined]);

    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(404, { message: "No fake verification needed for this user" });
  });

  it("succeeds without saving when the fake code does not contain the Double Counter flag", async () => {
    enqueue("prodbot", "findOne", [{ integrations: { dc: { enabled: true } } }, { fakeCode: 1, invalidated: "newfake" }]);

    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(200, { message: "Success" });

    expect(db.calls.some((call) => call.method === "save")).toBe(false);
  });

  it("removes only the Double Counter fake flag and keeps the join invalidated when other flags remain", async () => {
    const fakeJoin = { fakeCode: 33, invalidated: "newfake" };
    enqueue("prodbot", "findOne", [{ integrations: { dc: { enabled: true } } }, fakeJoin]);

    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(200, { message: "Success" });

    expect(fakeJoin.fakeCode).toBe(1);
    expect(fakeJoin.invalidated).toBe("newfake");
    expect(db.calls.at(-1)).toMatchObject({ connectionName: "prodbot", method: "save", data: fakeJoin });
  });

  it("clears invalidation when Double Counter was the only fake flag", async () => {
    const fakeJoin = { fakeCode: 32, invalidated: "newfake" };
    enqueue("prodbot", "findOne", [{ integrations: { dc: { enabled: true } } }, fakeJoin]);

    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(200, { message: "Success" });

    expect(fakeJoin.fakeCode).toBe(0);
    expect(fakeJoin.invalidated).toBeNull();
  });

  it("returns a 500 contract when Double Counter persistence fails", async () => {
    enqueue("prodbot", "findOne", [{ integrations: { dc: { enabled: true } } }, { fakeCode: 32, invalidated: "newfake" }]);
    enqueue("prodbot", "save", [new Error("save failed")]);

    await request(createApp()).post("/integrations/dc/verification").set("Authorization", auth("dc-secret")).send({ guild_id: "guild-1", member_id: "member-1" }).expect(500, { message: "Internal server error" });
  });

  it("removes fake reasons at the bit-mask level", async () => {
    await expect(removeFakeReason(33, fakeTypes.REQUIREDCVERIF)).resolves.toBe(1);
    await expect(removeFakeReason(1, 999)).rejects.toThrow("Invalid fake type");
  });
});

describe("Tebex webhook authentication", () => {
  it("rejects malformed bodies and invalid signatures", async () => {
    await request(createApp()).post("/payments").send({}).expect(400, { message: "Bad request" });
    await request(createApp()).post("/payments").type("text").send(JSON.stringify({ id: "webhook-1" })).expect(400, { message: "Bad request" });

    const body = paymentWebhook("validation.webhook");
    await request(createApp()).post("/payments").send(body).expect(403, { message: "Invalid signature" });
    await request(createApp()).post("/payments").set("X-Signature", "bad").send(body).expect(403, { message: "Invalid signature" });
  });

  it("accepts a correctly signed validation webhook without database side effects", async () => {
    const body = paymentWebhook("validation.webhook");

    const response = await signedTebexPost(body).expect(200);
    await flushAsyncWork();

    expect(response.body).toEqual({ id: "webhook-validation.webhook" });
    expect(db.calls).toHaveLength(0);
  });

  it("bypasses signature validation in dev mode", async () => {
    process.env.ENVIRONNEMENT = "dev";
    const body = paymentWebhook("validation.webhook");

    await request(createApp()).post("/payments").send(body).expect(200, { id: "webhook-validation.webhook" });
  });

  it("acknowledges unknown Tebex event types without side effects", async () => {
    await signedTebexPost(paymentWebhook("unknown.event")).expect(200, { id: "webhook-unknown.event" });
    await flushAsyncWork();

    expect(db.calls).toHaveLength(0);
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});

describe("Tebex payment lifecycle", () => {
  it("records a one-off payment and creates a monthly Gold service", async () => {
    enqueue("dash", "findOne", [
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
    ]);

    await signedTebexPost(paymentWebhook("payment.completed")).expect(200);
    await flushAsyncWork();

    expect(db.calls.find((call) => call.entity === "Payments" && call.method === "insert").data).toMatchObject({
      payment_id: "txn-1",
      amount: 9.99,
      currency: "EUR",
      mail: "ada@example.com",
      username: "Ada",
      discord_id: "discord-user-1",
      packages: ["101"],
      subscriptionReference: null,
    });
    expect(db.calls.find((call) => call.entity === "PremiumServices" && call.method === "insert").data).toMatchObject({
      user_id: "discord-user-1",
      status: "active",
      plan_id: "plan-1",
      subscriptionReference: null,
      suspendedAt: null,
      type: "subscription",
    });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "ada@example.com",
      dynamic_template_data: expect.objectContaining({ title: "Thanks for your purchase" }),
    }));
  });

  it("extends an existing monthly service for a one-off payment", async () => {
    const matchingService = { nextDue: "2026-01-15", status: "suspended" };
    enqueue("dash", "findOne", [
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      matchingService,
    ]);

    await signedTebexPost(paymentWebhook("payment.completed")).expect(200);
    await flushAsyncWork();

    expect(matchingService).toMatchObject({ nextDue: "2026-02-15", status: "active" });
    expect(db.calls.at(-1)).toMatchObject({ method: "save", data: matchingService });
  });

  it("extends an existing yearly service for a one-off payment", async () => {
    const matchingService = { nextDue: "2026-01-15", status: "suspended" };
    enqueue("dash", "findOne", [
      undefined,
      { id: "plan-1", period: "yearly", category: "gold", name: "Gold yearly" },
      matchingService,
    ]);

    await signedTebexPost(paymentWebhook("payment.completed")).expect(200);
    await flushAsyncWork();

    expect(matchingService).toMatchObject({ nextDue: "2027-01-15", status: "active" });
    expect(db.calls.at(-1)).toMatchObject({ method: "save", data: matchingService });
  });

  it("records duplicate payments without creating another payment row or service", async () => {
    enqueue("dash", "findOne", [{ id: "existing-payment" }]);

    await signedTebexPost(paymentWebhook("payment.completed")).expect(200);
    await flushAsyncWork();

    expect(db.calls.filter((call) => call.method === "insert")).toHaveLength(0);
  });

  it("records recurring payment rows and leaves service handling to subscription webhooks", async () => {
    enqueue("dash", "findOne", [undefined]);

    await signedTebexPost(paymentWebhook("payment.completed", { recurring_payment_reference: "sub-1" })).expect(200);
    await flushAsyncWork();

    expect(db.calls.find((call) => call.entity === "Payments" && call.method === "insert").data).toMatchObject({ subscriptionReference: "sub-1" });
    expect(db.calls.some((call) => call.entity === "PremiumServices")).toBe(false);
  });

  it("records one-off payments even when the Tebex package is unknown", async () => {
    enqueue("dash", "findOne", [undefined, undefined]);

    await signedTebexPost(paymentWebhook("payment.completed")).expect(200);
    await flushAsyncWork();

    expect(db.calls.some((call) => call.entity === "Payments" && call.method === "insert")).toBe(true);
    expect(db.calls.some((call) => call.entity === "PremiumServices" && call.method === "insert")).toBe(false);
  });

  it("creates a PBI service and sends the PBI onboarding email", async () => {
    enqueue("dash", "findOne", [
      undefined,
      { id: "plan-pbi", period: "monthly", category: "pbi", name: "Private bot" },
      undefined,
    ]);

    await signedTebexPost(paymentWebhook("payment.completed")).expect(200);
    await flushAsyncWork();

    expect(db.calls.find((call) => call.entity === "PremiumServices" && call.method === "insert").data).toMatchObject({ plan_id: "plan-pbi" });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      dynamic_template_data: expect.objectContaining({
        button_txt: "Private bot setup tutorial",
        button_url: "https://docs.invitelogger.me/pbi/get-pbi/setup-your-private-bot-instance",
      }),
    }));
  });

  it("creates non-notified one-off services for plan categories without onboarding email branches", async () => {
    enqueue("dash", "findOne", [
      undefined,
      { id: "plan-boost", period: "monthly", category: "goldBoost", name: "Gold boost" },
      undefined,
    ]);

    await signedTebexPost(paymentWebhook("payment.completed")).expect(200);
    await flushAsyncWork();

    expect(db.calls.find((call) => call.entity === "PremiumServices" && call.method === "insert").data).toMatchObject({ plan_id: "plan-boost" });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("handles product quantity by applying one service operation per item", async () => {
    enqueue("dash", "findOne", [
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
    ]);

    await signedTebexPost(paymentWebhook("payment.completed", { products: [{ id: 101, quantity: 2, name: "Gold monthly" }] })).expect(200);
    await flushAsyncWork();

    expect(db.calls.filter((call) => call.entity === "PremiumServices" && call.method === "insert")).toHaveLength(2);
  });

  it("updates payment status and sends an email for refunded payments", async () => {
    await signedTebexPost(paymentWebhook("payment.refunded", { status: { id: 2, description: "Refunded" } })).expect(200);
    await flushAsyncWork();

    expect(db.calls.at(0)).toMatchObject({
      connectionName: "dash",
      method: "update",
      entity: "Payments",
      criteria: { payment_id: "txn-1" },
      data: expect.objectContaining({ status: "Refunded", refundedAt: expect.any(String) }),
    });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "ada@example.com",
      dynamic_template_data: expect.objectContaining({ title: "You've been refunded" }),
    }));
  });
});

describe("Tebex subscription lifecycle", () => {
  it("creates a service for a started subscription when no matching service exists", async () => {
    enqueue("dash", "findOne", [
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
    ]);

    await signedTebexPost(recurringWebhook("recurring-payment.started")).expect(200);
    await flushAsyncWork();

    expect(db.calls.at(-1)).toMatchObject({
      connectionName: "dash",
      method: "insert",
      entity: "PremiumServices",
      data: expect.objectContaining({
        user_id: "discord-user-1",
        status: "active",
        plan_id: "plan-1",
        subscriptionReference: "sub-1",
        nextDue: "2026-02-15",
        type: "subscription",
      }),
    });
  });

  it("updates a service for a renewed subscription when a matching service exists", async () => {
    const matchingService = { nextDue: "2026-01-01", status: "suspended", updatedAt: "old" };
    enqueue("dash", "findOne", [
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      matchingService,
    ]);

    await signedTebexPost(recurringWebhook("recurring-payment.renewed")).expect(200);
    await flushAsyncWork();

    expect(matchingService).toMatchObject({ nextDue: "2026-02-15", status: "active", updatedAt: expect.any(String) });
    expect(db.calls.at(-1)).toMatchObject({ method: "save", data: matchingService });
  });

  it("ignores started subscriptions when the Tebex package is unknown", async () => {
    enqueue("dash", "findOne", [undefined]);

    await signedTebexPost(recurringWebhook("recurring-payment.started")).expect(200);
    await flushAsyncWork();

    expect(db.calls.some((call) => call.entity === "PremiumServices" && (call.method === "insert" || call.method === "save"))).toBe(false);
  });

  it("marks a subscription as ended and notifies the customer", async () => {
    await signedTebexPost(recurringWebhook("recurring-payment.ended", { cancel_reason: "Customer request" })).expect(200);
    await flushAsyncWork();

    expect(db.calls.at(0)).toMatchObject({
      connectionName: "dash",
      method: "update",
      entity: "PremiumServices",
      criteria: { subscriptionReference: "sub-1" },
      data: { subEndedAt: expect.any(String) },
    });
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "ada@example.com",
      dynamic_template_data: expect.objectContaining({
        title: "Your service will expire",
        button_txt: "Contact us",
        button_url: "https://discord.gg/invitelogger",
      }),
    }));
  });

  it("uses the fallback cancellation reason when a subscription ends without one", async () => {
    await signedTebexPost(recurringWebhook("recurring-payment.ended", { cancel_reason: null })).expect(200);
    await flushAsyncWork();

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      dynamic_template_data: expect.objectContaining({
        message: expect.stringContaining("not specified"),
      }),
    }));
  });
});
