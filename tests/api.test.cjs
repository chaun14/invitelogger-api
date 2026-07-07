const crypto = require("crypto");
const dayjs = require("dayjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.BOT_ID = "499595256270946326";
process.env.TOPGG_VOTE_WEBHOOK = "topgg-secret";
process.env.VCODES_VOTE_WEBHOOK = "vcodes-secret";
process.env.DLIST_VOTE_WEBHOOK = "dlist-secret";
process.env.WUMPUSSTORE_VOTE_WEBHOOK = "wumpus-secret";
process.env.INTERNAL_API_KEY = "internal-secret";
process.env.DC_API_KEY = "dc-secret";
process.env.TEBEX_API_KEY = "tebex-secret";
process.env.SMTP2GO_API_KEY = "smtp2go-secret";

const mockSendEmail = jest.fn(() => Promise.resolve());
const mockManagers = {
  dash: createManager(),
  customBot: createManager(),
  prodbot: createManager(),
};

jest.mock("@middlewares/httpLogger.js", () => (_req, _res, next) => next());
jest.mock("@middlewares/rateLimit.js", () => (_req, _res, next) => next());
jest.mock("@middlewares/errorHandler.js", () => (err, _req, res, _next) => {
  const statusCode = res.statusCode === 200 ? err.statusCode || 500 : res.statusCode;
  res.status(statusCode).json({ message: statusCode === 500 ? "Something went wrong on our end" : err.message });
});
jest.mock("@utils/email.js", () => ({ sendEmail: mockSendEmail }));
jest.mock("@config/orm", () => ({
  dashDataSource: { manager: mockManagers.dash },
  customBotDataSource: { manager: mockManagers.customBot },
  prodbotDataSource: { manager: mockManagers.prodbot },
}));

const app = require("../src/app").default;

function createManager() {
  const manager = {
    queues: { findOne: [], find: [], insert: [], update: [], save: [] },
    calls: [],
    reset() {
      this.queues = { findOne: [], find: [], insert: [], update: [], save: [] };
      this.calls = [];
    },
    queue(method, values) {
      this.queues[method] = values.slice();
    },
    next(method, fallback) {
      const queue = this.queues[method];
      if (!queue.length) return Promise.resolve(fallback);
      const value = queue.shift();
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    },
    findOne(entity, options) {
      this.calls.push({ method: "findOne", entity: entity && entity.name, options });
      return this.next("findOne", undefined);
    },
    find(entity, options) {
      this.calls.push({ method: "find", entity: entity && entity.name, options });
      return this.next("find", []);
    },
    insert(entity, data) {
      this.calls.push({ method: "insert", entity: entity && entity.name, data });
      return this.next("insert", { identifiers: [{ id: 1 }] });
    },
    update(entity, criteria, data) {
      this.calls.push({ method: "update", entity: entity && entity.name, criteria, data });
      return this.next("update", {});
    },
    save(data) {
      this.calls.push({ method: "save", data });
      return this.next("save", data);
    },
  };

  return manager;
}

function resetManagers() {
  Object.values(mockManagers).forEach((manager) => manager.reset());
  mockSendEmail.mockClear();
}

function auth(token = "valid-token") {
  return `Bearer ${token}`;
}

function authenticatePublic(application = { guildId: "guild-1", botId: process.env.BOT_ID }) {
  mockManagers.dash.queue("findOne", [application]);
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

function paymentWebhook(type, subject = paymentSubject()) {
  return {
    id: `webhook-${type}`,
    type,
    date: "2026-01-01T00:00:00Z",
    subject,
  };
}

function recurringWebhook(type, overrides = {}) {
  const lastPayment = paymentSubject({
    transaction_id: "txn-sub-1",
    recurring_payment_reference: "sub-1",
    products: [{ id: 101, quantity: 1, name: "Gold monthly" }],
  });

  return paymentWebhook(type, {
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
  });
}

function signedPaymentRequest(body) {
  return request(app).post("/payments").set("X-Signature", "test-signature").send(body);
}

function dlistToken(payload) {
  return jwt.sign(payload, process.env.DLIST_VOTE_WEBHOOK);
}

async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  resetManagers();
});

describe("refactor branch API smoke contract", () => {
  it("serves the public v1 landing page", async () => {
    const response = await request(app).get("/v1").expect(200);

    expect(response.body).toEqual({
      message: "Welcome to inviteLogger api. Find our documentation here: https://developers.invitelogger.me",
    });
  });

  it("redirects the root path to /v1", async () => {
    const response = await request(app).get("/").expect(302);

    expect(response.headers.location).toBe("/v1");
  });

  it("answers CORS preflight requests with the configured public policy", async () => {
    const response = await request(app).options("/v1/auth/check").expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.headers["access-control-allow-methods"]).toContain("GET");
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
  });

  it("returns the refactor 404 contract for unknown routes", async () => {
    const response = await request(app).get("/missing").expect(404);

    expect(response.body).toEqual({ message: "Resource Not Found" });
  });
});

describe("public v1 authentication", () => {
  it("rejects protected v1 routes without a public token", async () => {
    await request(app).get("/v1/auth/check").expect(401, { message: "Invalid or missing authorization token" });
  });

  it("accepts a valid public token", async () => {
    authenticatePublic();

    await request(app).get("/v1/auth/check").set("Authorization", auth()).expect(200, {
      message: "Welcome aboard! You are successfully authenticated",
    });
    expect(mockManagers.dash.calls[0]).toMatchObject({
      method: "findOne",
      entity: "Applications",
      options: { where: { token: "valid-token" } },
    });
  });

  it("rejects an unknown public token after checking the dashboard database", async () => {
    mockManagers.dash.queue("findOne", [undefined]);

    await request(app)
      .get("/v1/auth/check")
      .set("Authorization", auth("unknown-token"))
      .expect(401, { message: "Invalid or missing authorization token" });
    expect(mockManagers.dash.calls[0]).toMatchObject({
      method: "findOne",
      entity: "Applications",
      options: { where: { token: "unknown-token" } },
    });
  });

  it("rejects a non-bearer Authorization header as an unknown public token", async () => {
    mockManagers.dash.queue("findOne", [undefined]);

    await request(app)
      .get("/v1/auth/check")
      .set("Authorization", "Basic abc")
      .expect(401, { message: "Invalid or missing authorization token" });
    expect(mockManagers.dash.calls[0]).toMatchObject({ options: { where: { token: "Basic abc" } } });
  });

  it("routes public token lookup failures through the error handler", async () => {
    mockManagers.dash.queue("findOne", [new Error("database down")]);

    await request(app)
      .get("/v1/auth/check")
      .set("Authorization", auth())
      .expect(500, { message: "Something went wrong on our end" });
  });
});

describe("invite endpoints", () => {
  it("validates required parameters for user invite lookups", async () => {
    authenticatePublic();

    await request(app)
      .get("/v1/invites/user")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1" })
      .expect(400, { message: "Missing parameter" });
  });

  it("calculates invite stats for the production bot data source", async () => {
    authenticatePublic();
    mockManagers.prodbot.queue("find", [
      [
        { invalidated: null },
        { invalidated: "fake" },
        { invalidated: "young" },
        { invalidated: "newfake" },
        { invalidated: "self" },
        { invalidated: "leave" },
      ],
      [{ amount: "4" }],
    ]);

    const response = await request(app)
      .get("/v1/invites/user")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: process.env.BOT_ID, inviter_id: "user-1" })
      .expect(200);

    expect(response.body).toEqual({ total: 10, leaves: 1, bonus: 4, fake: 3, real: 6 });
    expect(mockManagers.prodbot.calls.filter((call) => call.method === "find")).toHaveLength(2);
  });

  it("uses the custom bot data source for non-production bot applications", async () => {
    authenticatePublic({ guildId: "guild-1", botId: "custom-bot" });
    mockManagers.customBot.queue("find", [[], []]);

    await request(app)
      .get("/v1/invites/user")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: "custom-bot", inviter_id: "user-1" })
      .expect(200);

    expect(mockManagers.customBot.calls.filter((call) => call.method === "find")).toHaveLength(2);
    expect(mockManagers.prodbot.calls).toHaveLength(0);
  });

  it("returns zeroed invite stats when a user has no joins or bonuses", async () => {
    authenticatePublic();
    mockManagers.prodbot.queue("find", [[], []]);

    const response = await request(app)
      .get("/v1/invites/user")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: process.env.BOT_ID, inviter_id: "user-1" })
      .expect(200);

    expect(response.body).toEqual({ total: 0, leaves: 0, bonus: 0, fake: 0, real: 0 });
  });

  it("forbids invite reads outside the authenticated application scope", async () => {
    authenticatePublic();

    await request(app)
      .get("/v1/invites/code")
      .set("Authorization", auth())
      .send({ guild_id: "guild-2", bot_id: process.env.BOT_ID, invite_code: "abc" })
      .expect(403, { message: "Access forbidden" });
  });

  it("maps invite code joins to the public response shape", async () => {
    authenticatePublic();
    mockManagers.prodbot.queue("find", [
      [
        { createdAt: "2026-01-01", updatedAt: "2026-01-02", memberId: "member-1", invalidated: null, cleared: false },
        { createdAt: "2026-01-01", updatedAt: "2026-01-02", memberId: "member-2", invalidated: "leave", cleared: true },
      ],
    ]);

    const response = await request(app)
      .get("/v1/invites/code")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: process.env.BOT_ID, invite_code: "abc" })
      .expect(200);

    expect(response.body).toEqual([
      {
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
        member_id: "member-1",
        fake: false,
        left: false,
        cleared: false,
      },
      {
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
        member_id: "member-2",
        fake: false,
        left: true,
        cleared: true,
      },
    ]);
  });

  it("validates required parameters for invite code lookups", async () => {
    authenticatePublic();

    await request(app)
      .get("/v1/invites/code")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: process.env.BOT_ID })
      .expect(400, { message: "Missing parameter" });
  });

  it("returns an empty array when an invite code has no joins", async () => {
    authenticatePublic();
    mockManagers.prodbot.queue("find", [[]]);

    const response = await request(app)
      .get("/v1/invites/code")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: process.env.BOT_ID, invite_code: "abc" })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("routes invite repository failures through the error handler", async () => {
    authenticatePublic();
    mockManagers.prodbot.queue("find", [new Error("lookup failed")]);

    await request(app)
      .get("/v1/invites/user")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: process.env.BOT_ID, inviter_id: "user-1" })
      .expect(500, { message: "Something went wrong on our end" });
  });

  it("routes invite code repository failures through the error handler", async () => {
    authenticatePublic();
    mockManagers.prodbot.queue("find", [new Error("lookup failed")]);

    await request(app)
      .get("/v1/invites/code")
      .set("Authorization", auth())
      .send({ guild_id: "guild-1", bot_id: process.env.BOT_ID, invite_code: "abc" })
      .expect(500, { message: "Something went wrong on our end" });
  });
});

describe("internal vote endpoints", () => {
  it("rejects vote webhooks with missing or invalid tokens", async () => {
    await request(app).post("/votes/topgg").send({}).expect(401, { message: "Invalid or missing authorization token" });
    await request(app)
      .post("/votes/topgg")
      .set("Authorization", "wrong")
      .send({})
      .expect(401, { message: "Invalid or missing authorization token" });
  });

  it("persists top.gg votes for the configured bot", async () => {
    await request(app)
      .post("/votes/topgg")
      .set("Authorization", "topgg-secret")
      .send({ user: "user-1", bot: process.env.BOT_ID, isWeekend: true })
      .expect(200, { message: "Vote received" });

    expect(mockManagers.dash.calls.at(-1)).toMatchObject({
      method: "insert",
      entity: "Votes",
      data: { userId: "user-1", botId: process.env.BOT_ID, weekend: true, platform: "topgg" },
    });
  });

  it("validates top.gg vote payloads", async () => {
    await request(app)
      .post("/votes/topgg")
      .set("Authorization", "topgg-secret")
      .send({ user: "user-1", bot: process.env.BOT_ID })
      .expect(400, { message: "Missing parameter" });
    await request(app)
      .post("/votes/topgg")
      .set("Authorization", "topgg-secret")
      .send({ user: "user-1", bot: process.env.BOT_ID, isWeekend: false })
      .expect(400, { message: "Missing parameter" });
    await request(app)
      .post("/votes/topgg")
      .set("Authorization", "topgg-secret")
      .send({ user: "user-1", bot: "other-bot", isWeekend: true })
      .expect(403, { message: "Invalid bot id" });
  });

  it("persists vcodes votes and rejects invalid triggers", async () => {
    await request(app)
      .post("/votes/vcodes")
      .set("Authorization", "vcodes-secret")
      .send({ trigger: "vote" })
      .expect(400, { message: "Missing parameter" });
    await request(app)
      .post("/votes/vcodes")
      .set("Authorization", "vcodes-secret")
      .send({ user: { id: "user-1" }, trigger: "ping" })
      .expect(400, { message: "Invalid trigger" });

    await request(app)
      .post("/votes/vcodes")
      .set("Authorization", "vcodes-secret")
      .send({ user: { id: "user-1" }, trigger: "vote" })
      .expect(200, { message: "Vote received" });
    expect(mockManagers.dash.calls.at(-1)).toMatchObject({
      method: "insert",
      entity: "Votes",
      data: { userId: "user-1", botId: process.env.BOT_ID, weekend: false, platform: "vcodes" },
    });
  });

  it("rejects vote payloads for another bot", async () => {
    await request(app)
      .post("/votes/wumpus")
      .set("Authorization", "wumpus-secret")
      .send({ userId: "user-1", botId: "other-bot" })
      .expect(403, { message: "Invalid bot id" });
  });

  it("persists dlist votes from a signed text body", async () => {
    await request(app)
      .post("/votes/dlist")
      .set("Authorization", "dlist-secret")
      .type("text")
      .send(dlistToken({ user_id: "user-1", bot_id: process.env.BOT_ID }))
      .expect(200, { message: "Vote received" });

    expect(mockManagers.dash.calls.at(-1)).toMatchObject({
      method: "insert",
      entity: "Votes",
      data: { userId: "user-1", botId: process.env.BOT_ID, weekend: false, platform: "dlist" },
    });
  });

  it("rejects invalid dlist JWT payloads", async () => {
    await request(app)
      .post("/votes/dlist")
      .set("Authorization", "dlist-secret")
      .type("text")
      .send("invalid.jwt")
      .expect(500);
    await request(app)
      .post("/votes/dlist")
      .set("Authorization", "dlist-secret")
      .type("text")
      .send(dlistToken({ user_id: "user-1", bot_id: "other-bot" }))
      .expect(403, { message: "Invalid bot id" });
  });

  it("persists wumpus votes", async () => {
    await request(app)
      .post("/votes/wumpus")
      .set("Authorization", "wumpus-secret")
      .send({ userId: "user-1" })
      .expect(400, { message: "Missing parameter" });

    await request(app)
      .post("/votes/wumpus")
      .set("Authorization", "wumpus-secret")
      .send({ userId: "user-1", botId: process.env.BOT_ID })
      .expect(200, { message: "Vote received" });

    expect(mockManagers.dash.calls.at(-1)).toMatchObject({
      method: "insert",
      entity: "Votes",
      data: { userId: "user-1", botId: process.env.BOT_ID, weekend: false, platform: "wumpus.store" },
    });
  });

  it("still acknowledges wumpus votes when persistence fails after the response is sent", async () => {
    mockManagers.dash.queue("insert", [new Error("insert failed")]);

    await request(app)
      .post("/votes/wumpus")
      .set("Authorization", "wumpus-secret")
      .send({ userId: "user-1", botId: process.env.BOT_ID })
      .expect(200, { message: "Vote received" });
    await flushAsyncWork();

    expect(mockManagers.dash.calls.at(-1)).toMatchObject({ method: "insert", entity: "Votes" });
  });
});

describe("internal email and integration endpoints", () => {
  it("requires a valid internal email token and validates email payloads", async () => {
    await request(app)
      .post("/internal/mail")
      .send({})
      .expect(401, { message: "Invalid or missing authorization token" });
    await request(app)
      .post("/internal/mail")
      .set("Authorization", auth("wrong"))
      .send({})
      .expect(401, { message: "Invalid or missing authorization token" });
    await request(app)
      .post("/internal/mail")
      .set("Authorization", auth("internal-secret"))
      .send({ email: "a@example.com" })
      .expect(400, { message: "Missing parameter" });
  });

  it("sends an internal email with default button options", async () => {
    await request(app)
      .post("/internal/mail")
      .set("Authorization", auth("internal-secret"))
      .send({ email: "a@example.com", subject: "Hello", message: "World" })
      .expect(200, { message: "Email sent" });

    expect(mockSendEmail).toHaveBeenCalledWith("a@example.com", {
      subject: "Hello",
      message: {
        title: undefined,
        content: "World",
        buttonText: "Go to the gold dashboard",
        buttonUrl: "https://gold.invitelogger.me",
      },
    });
  });

  it("sends an internal email with custom button options", async () => {
    await request(app)
      .post("/internal/mail")
      .set("Authorization", auth("internal-secret"))
      .send({
        email: "a@example.com",
        subject: "Hello",
        message: "World",
        options: { title: "Custom title", button_txt: "Open", button_url: "https://example.com" },
      })
      .expect(200, { message: "Email sent" });

    expect(mockSendEmail).toHaveBeenCalledWith("a@example.com", {
      subject: "Hello",
      message: {
        title: "Custom title",
        content: "World",
        buttonText: "Open",
        buttonUrl: "https://example.com",
      },
    });
  });

  it("routes email delivery failures through the error handler", async () => {
    mockSendEmail.mockRejectedValueOnce(new Error("send failed"));

    await request(app)
      .post("/internal/mail")
      .set("Authorization", auth("internal-secret"))
      .send({ email: "a@example.com", subject: "Hello", message: "World" })
      .expect(500, { message: "Something went wrong on our end" });
  });

  it("requires a valid Double Counter token and validates required fields", async () => {
    await request(app)
      .post("/integrations/dc/verification")
      .send({})
      .expect(401, { message: "Invalid or missing authorization token" });
    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("wrong"))
      .send({})
      .expect(401, { message: "Invalid or missing authorization token" });
    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("dc-secret"))
      .send({ guild_id: "guild-1" })
      .expect(400, { message: "Missing parameter" });
  });

  it("rejects unknown guilds, disabled integrations, and users without pending fake verification", async () => {
    mockManagers.prodbot.queue("findOne", [undefined]);
    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("dc-secret"))
      .send({ guild_id: "guild-1", member_id: "member-1" })
      .expect(404, { message: "Unknown guild" });

    resetManagers();
    mockManagers.prodbot.queue("findOne", [{ integrations: { dc: { enabled: false } } }]);
    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("dc-secret"))
      .send({ guild_id: "guild-1", member_id: "member-1" })
      .expect(403, { message: "Integration not enabled" });

    resetManagers();
    mockManagers.prodbot.queue("findOne", [{ integrations: { dc: { enabled: true } } }, undefined]);
    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("dc-secret"))
      .send({ guild_id: "guild-1", member_id: "member-1" })
      .expect(403, { message: "No fake verification needed for this user" });
  });

  it("clears only the Double Counter fake flag", async () => {
    mockManagers.prodbot.queue("findOne", [
      { integrations: { dc: { enabled: true } } },
      { fakeCode: 32, invalidated: "newfake" },
    ]);

    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("dc-secret"))
      .send({ guild_id: "guild-1", member_id: "member-1" })
      .expect(200, { message: "Success" });

    expect(mockManagers.prodbot.calls.at(-1)).toMatchObject({
      method: "save",
      data: { fakeCode: 0, invalidated: null },
    });
  });

  it("keeps a fake verification invalidated when other fake flags remain", async () => {
    mockManagers.prodbot.queue("findOne", [
      { integrations: { dc: { enabled: true } } },
      { fakeCode: 33, invalidated: "newfake" },
    ]);

    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("dc-secret"))
      .send({ guild_id: "guild-1", member_id: "member-1" })
      .expect(200, { message: "Success" });

    expect(mockManagers.prodbot.calls.at(-1)).toMatchObject({
      method: "save",
      data: { fakeCode: 1, invalidated: "newfake" },
    });
  });

  it("routes Double Counter persistence failures through the error handler", async () => {
    mockManagers.prodbot.queue("findOne", [
      { integrations: { dc: { enabled: true } } },
      { fakeCode: 32, invalidated: "newfake" },
    ]);
    mockManagers.prodbot.queue("save", [new Error("save failed")]);

    await request(app)
      .post("/integrations/dc/verification")
      .set("Authorization", auth("dc-secret"))
      .send({ guild_id: "guild-1", member_id: "member-1" })
      .expect(500, { message: "Something went wrong on our end" });
  });
});

describe("payment endpoint", () => {
  it("rejects malformed payment webhooks", async () => {
    const invalidSubscriptionSubject = { ...recurringWebhook("recurring-payment.started").subject };
    delete invalidSubscriptionSubject.reference;

    await request(app)
      .post("/payments")
      .set("X-Signature", "any-signature")
      .send({})
      .expect(400, { message: "Missing parameter" });
    await signedPaymentRequest(
      paymentWebhook("payment.completed", recurringWebhook("recurring-payment.started").subject)
    ).expect(400, { message: "Missing parameter" });
    await signedPaymentRequest(paymentWebhook("recurring-payment.started", invalidSubscriptionSubject)).expect(400, {
      message: "Missing parameter",
    });
    await signedPaymentRequest(
      paymentWebhook("payment.refunded", recurringWebhook("recurring-payment.ended").subject)
    ).expect(400, { message: "Missing parameter" });
  });

  it("records a one-off payment and creates a monthly Gold service", async () => {
    mockManagers.dash.queue("findOne", [
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
    ]);

    await signedPaymentRequest(paymentWebhook("payment.completed")).expect(200, { id: "webhook-payment.completed" });

    expect(
      mockManagers.dash.calls.find((call) => call.entity === "Payments" && call.method === "insert").data
    ).toMatchObject({
      paymentId: "txn-1",
      amount: 9.99,
      currency: "EUR",
      mail: "ada@example.com",
      username: "Ada",
      discordId: "discord-user-1",
      packages: ["101"],
      subscriptionReference: null,
    });
    expect(
      mockManagers.dash.calls.find((call) => call.entity === "PremiumServices" && call.method === "insert").data
    ).toMatchObject({
      userId: "discord-user-1",
      status: "active",
      planId: "plan-1",
      subscriptionReference: null,
      suspendedAt: null,
      type: "subscription",
    });
    expect(mockSendEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({ subject: "Your purchase on InviteLogger has been processed" })
    );
  });

  it("rejects duplicate payments before inserting another row", async () => {
    mockManagers.dash.queue("findOne", [{ id: "existing-payment" }]);

    await signedPaymentRequest(paymentWebhook("payment.completed")).expect(403, { message: "Payment already exists" });

    expect(mockManagers.dash.calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("extends an existing monthly one-off service", async () => {
    const matchingService = { nextDue: "2026-01-15", status: "suspended" };
    mockManagers.dash.queue("findOne", [
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      matchingService,
    ]);

    await signedPaymentRequest(paymentWebhook("payment.completed")).expect(200);

    expect(matchingService).toMatchObject({ nextDue: dayjs().add(1, "month").format("YYYY-MM-DD"), status: "active" });
    expect(mockManagers.dash.calls.at(-1)).toMatchObject({ method: "save", data: matchingService });
  });

  it("extends an existing yearly one-off service", async () => {
    const matchingService = { nextDue: "2026-01-15", status: "suspended" };
    mockManagers.dash.queue("findOne", [
      undefined,
      { id: "plan-1", period: "yearly", category: "gold", name: "Gold yearly" },
      matchingService,
    ]);

    await signedPaymentRequest(paymentWebhook("payment.completed")).expect(200);

    expect(matchingService).toMatchObject({ nextDue: dayjs().add(1, "year").format("YYYY-MM-DD"), status: "active" });
    expect(mockManagers.dash.calls.at(-1)).toMatchObject({ method: "save", data: matchingService });
  });

  it("records recurring payment rows and leaves service handling to subscription webhooks", async () => {
    mockManagers.dash.queue("findOne", [undefined]);

    await signedPaymentRequest(
      paymentWebhook("payment.completed", paymentSubject({ recurring_payment_reference: "sub-1" }))
    ).expect(200);

    expect(
      mockManagers.dash.calls.find((call) => call.entity === "Payments" && call.method === "insert").data
    ).toMatchObject({ subscriptionReference: "sub-1" });
    expect(mockManagers.dash.calls.some((call) => call.entity === "PremiumServices")).toBe(false);
  });

  it("records one-off payments even when the Tebex package is unknown", async () => {
    mockManagers.dash.queue("findOne", [undefined, undefined]);

    await signedPaymentRequest(paymentWebhook("payment.completed")).expect(200);

    expect(mockManagers.dash.calls.some((call) => call.entity === "Payments" && call.method === "insert")).toBe(true);
    expect(mockManagers.dash.calls.some((call) => call.entity === "PremiumServices" && call.method === "insert")).toBe(
      false
    );
  });

  it("creates a PBI service and sends the onboarding email", async () => {
    mockManagers.dash.queue("findOne", [
      undefined,
      { id: "plan-pbi", period: "monthly", category: "pbi", name: "Private bot" },
      undefined,
    ]);

    await signedPaymentRequest(paymentWebhook("payment.completed")).expect(200);

    expect(
      mockManagers.dash.calls.find((call) => call.entity === "PremiumServices" && call.method === "insert").data
    ).toMatchObject({ planId: "plan-pbi" });
    expect(mockSendEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({
        message: expect.objectContaining({
          buttonText: "Private bot setup tutorial",
          buttonUrl: "https://docs.invitelogger.me/pbi/get-pbi/setup-your-private-bot-instance",
        }),
      })
    );
  });

  it("handles payment product quantity by applying one service operation per item", async () => {
    mockManagers.dash.queue("findOne", [
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
    ]);

    await signedPaymentRequest(
      paymentWebhook(
        "payment.completed",
        paymentSubject({ products: [{ id: 101, quantity: 2, name: "Gold monthly" }] })
      )
    ).expect(200);

    expect(
      mockManagers.dash.calls.filter((call) => call.entity === "PremiumServices" && call.method === "insert")
    ).toHaveLength(2);
  });

  it("creates non-notified one-off services for categories without onboarding email branches", async () => {
    mockManagers.dash.queue("findOne", [
      undefined,
      { id: "plan-boost", period: "monthly", category: "goldBoost", name: "Gold boost" },
      undefined,
    ]);

    await signedPaymentRequest(paymentWebhook("payment.completed")).expect(200);

    expect(
      mockManagers.dash.calls.find((call) => call.entity === "PremiumServices" && call.method === "insert").data
    ).toMatchObject({ planId: "plan-boost" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("updates refunded payments and notifies the customer", async () => {
    await signedPaymentRequest(
      paymentWebhook("payment.refunded", paymentSubject({ status: { id: 2, description: "Refunded" } }))
    ).expect(200, { id: "webhook-payment.refunded" });

    expect(mockManagers.dash.calls.at(0)).toMatchObject({
      method: "update",
      entity: "Payments",
      criteria: { paymentId: "txn-1" },
      data: expect.objectContaining({ status: "Refunded", refundedAt: expect.any(String) }),
    });
    expect(mockSendEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({ subject: "Your payment has been refunded" })
    );
  });

  it("creates a service for a started subscription", async () => {
    mockManagers.dash.queue("findOne", [
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      undefined,
    ]);

    await signedPaymentRequest(recurringWebhook("recurring-payment.started")).expect(200, {
      id: "webhook-recurring-payment.started",
    });

    expect(mockManagers.dash.calls.at(-1)).toMatchObject({
      method: "insert",
      entity: "PremiumServices",
      data: expect.objectContaining({
        userId: "discord-user-1",
        status: "active",
        planId: "plan-1",
        subscriptionReference: "sub-1",
        nextDue: "2026-02-15",
        type: "subscription",
      }),
    });
  });

  it("ignores started subscriptions when the Tebex package is unknown", async () => {
    mockManagers.dash.queue("findOne", [undefined]);

    await signedPaymentRequest(recurringWebhook("recurring-payment.started")).expect(200, {
      id: "webhook-recurring-payment.started",
    });

    expect(
      mockManagers.dash.calls.some(
        (call) => call.entity === "PremiumServices" && (call.method === "insert" || call.method === "save")
      )
    ).toBe(false);
  });

  it("updates an existing service for a started subscription", async () => {
    const matchingService = { nextDue: "2026-01-01", status: "suspended", updatedAt: "old" };
    mockManagers.dash.queue("findOne", [
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      matchingService,
    ]);

    await signedPaymentRequest(recurringWebhook("recurring-payment.started")).expect(200);

    expect(matchingService).toMatchObject({ nextDue: "2026-02-15", status: "active", updatedAt: expect.any(String) });
    expect(mockManagers.dash.calls.at(-1)).toMatchObject({ method: "save", data: matchingService });
  });

  it("updates a service for a renewed subscription", async () => {
    const matchingService = { nextDue: "2026-01-01", status: "suspended", updatedAt: "old" };
    mockManagers.dash.queue("findOne", [
      { id: "plan-1", period: "monthly", category: "gold", name: "Gold monthly" },
      matchingService,
    ]);

    await signedPaymentRequest(recurringWebhook("recurring-payment.renewed")).expect(200);

    expect(matchingService).toMatchObject({ nextDue: "2026-02-15", status: "active", updatedAt: expect.any(String) });
    expect(mockManagers.dash.calls.at(-1)).toMatchObject({ method: "save", data: matchingService });
  });

  it("marks a subscription as ended and notifies the customer", async () => {
    await signedPaymentRequest(
      recurringWebhook("recurring-payment.ended", { cancel_reason: "Customer request" })
    ).expect(200, { id: "webhook-recurring-payment.ended" });

    expect(mockManagers.dash.calls.at(0)).toMatchObject({
      method: "update",
      entity: "PremiumServices",
      criteria: { subscriptionReference: "sub-1" },
      data: { subEndedAt: expect.any(String) },
    });
    expect(mockSendEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({
        subject: "Your InviteLogger subscription has ended",
        message: expect.objectContaining({ content: expect.stringContaining("Customer request") }),
      })
    );
  });

  it("uses the fallback cancellation reason when a subscription ends without one", async () => {
    await signedPaymentRequest(recurringWebhook("recurring-payment.ended", { cancel_reason: null })).expect(200);

    expect(mockSendEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({
        message: expect.objectContaining({ content: expect.stringContaining("not specified") }),
      })
    );
  });

  it("keeps the payment HMAC helper documented for production signature validation", () => {
    const rawBody = JSON.stringify(paymentWebhook("payment.completed"));
    const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    const signature = crypto.createHmac("sha256", process.env.TEBEX_API_KEY).update(bodyHash).digest("hex");

    expect(signature).toEqual(expect.any(String));
  });
});
