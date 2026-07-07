const { env } = process;

export enum Environments {
  DEVELOPMENT,
  PRODUCTION,
}

const parseRateLimitTime = (timeValue?: string) => {
  if (!timeValue) return 15 * 60 * 1000;

  const unit = timeValue.slice(-1);
  const time = Number(timeValue.slice(0, -1));

  console.log(unit);

  switch (unit) {
    case "h":
      return time * 60 * 60 * 1000;
    case "m":
      return time * 60 * 1000;
    case "s":
      return time * 1000;
    default:
      throw new Error(`Unexpected unit for RATE_LIMIT_TIMEt: ${unit}. Accepted unit: 'h', 'm' and 's'`);
  }
};

const config = {
  // Bot Id
  botId: env.BOT_ID,

  // Rate limit
  rateLimit: {
    ip: {
      max: env.RATE_LIMIT_IP_ACCESS ? Number(env.RATE_LIMIT_IP_TIME) : 100,
      time: parseRateLimitTime(env.RATE_LIMIT_IP_TIME),
    },
    token: {
      max: env.RATE_LIMIT_TOKEN_ACCESS ? Number(env.RATE_LIMIT_TOKEN_TIME) : 100,
      time: parseRateLimitTime(env.RATE_LIMIT_TOKEN_TIME),
    },
  },

  // Port number for the server
  port: env.PORT,

  // Environment type (development || production)
  environment: env.NODE_ENV === "production" ? Environments.PRODUCTION : Environments.DEVELOPMENT,

  // Webhook configurations for votes
  voteWebhooks: {
    topgg: env.TOPGG_VOTE_WEBHOOK,
    vcodes: env.VCODES_VOTE_WEBHOOK,
    dlist: env.DLIST_VOTE_WEBHOOK,
    wumpus: env.WUMPUSSTORE_VOTE_WEBHOOK,
  },

  // Tebex payment API key
  tebexKey: env.TEBEX_API_KEY,

  // Internal API key for secured access
  internalApiKey: env.INTERNAL_API_KEY,

  // SMTP2GO API key for sending emails
  smtp2goApiKey: env.SMTP2GO_API_KEY,

  // DoubleCounter integration API key
  dcApiKey: env.DC_API_KEY,

  // Database configurations
  databases: {
    dash: {
      host: env.DASH_DB_HOST,
      port: Number(env.DASH_DB_PORT),
      username: env.DASH_DB_USERNAME,
      password: env.DASH_DB_PASSWORD,
      database: env.DASH_DB_DATABASE,
    },
    bot: {
      host: env.BOT_DB_HOST,
      port: Number(env.BOT_DB_PORT),
      username: env.BOT_DB_USERNAME,
      password: env.BOT_DB_PASSWORD,
      database: env.BOT_DB_DATABASE,
    },
    prod: {
      host: env.PROD_DB_HOST,
      port: Number(env.PROD_DB_PORT),
      username: env.PROD_DB_USERNAME,
      password: env.PROD_DB_PASSWORD,
      database: env.PROD_DB_DATABASE,
    },
  },
};

export default config;
