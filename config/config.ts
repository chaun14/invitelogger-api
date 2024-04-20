const { env } = process;

export enum Environments {
  DEVELOPMENT,
  PRODUCTION,
}

const config = {
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

  // SendGrid API key for sending emails
  sendgridApiKey: env.SENDGRID_API_KEY,

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
