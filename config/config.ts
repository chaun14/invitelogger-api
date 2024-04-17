const { env } = process;

export enum Environments {
  Development,
  Production,
}

const config = {
  // Port number for the server
  port: env.PORT,

  // Environment type (development || production)
  environment: env.NODE_ENV === "production" ? Environments.Production : Environments.Development,

  // Webhook configurations for votes
  voteWebhooks: {
    topGG: env.TOPGG_VOTE_WEBHOOK,
    vCodes: env.VCODES_VOTE_WEBHOOK,
    dList: env.DLIST_VOTE_WEBHOOK,
    wumpusStore: env.WUMPUSSTORE_VOTE_WEBHOOK,
  },

  // Tebex payment API key
  tebexKey: env.TEBEX_API_KEY,

  // Internal API key for secured access
  internalApiKey: env.INTERNAL_API_KEY,

  // SendGrid API key for sending emails
  sendgridApiKey: env.SENDGRID_API_KEY,

  // DoubleCounter integration API key
  dcApiKey: env.DC_API_KEY,

  // Database configurations
  databases: {
    dashboard: {
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
  },
};

export default config;
