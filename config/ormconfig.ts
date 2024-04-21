import { DataSource, DataSourceOptions } from "typeorm";

import config, { Environments } from "@config";

import Applications from "@entity/dash/Applications.js";
import Payments from "@entity/dash/Payments.js";
import PremiumPlans from "@entity/dash/PremiumPlans.js";
import PremiumServices from "@entity/dash/PremiumServices.js";
import Votes from "@entity/dash/Votes.js";
import CustomInvites from "@entity/bot/CustomInvites.js";
import GuildSettings from "@entity/bot/GuildSettings.js";
import Joins from "@entity/bot/Joins.js";

const entities: { dash: object[]; bot: object[]; prod: object[] } = {
  dash: [Applications, Payments, PremiumPlans, PremiumServices, Votes],
  bot: [CustomInvites, GuildSettings, Joins],
  prod: [CustomInvites, GuildSettings, Joins],
};

const createDataSourceOptions = (name: string): DataSourceOptions => ({
  type: "mysql",
  host: config.databases[name]["host"]!,
  port: config.databases[name]["port"]!,
  username: config.databases[name]["username"]!,
  password: config.databases[name]["password"]!,
  database: config.databases[name]["database"]!,
  synchronize: config.environment === Environments.DEVELOPMENT,
  logging: ["error"],
  entities: entities[name],
});

export const prodDataSource = new DataSource(createDataSourceOptions("prod"));
export const dashDataSource = new DataSource(createDataSourceOptions("dash"));
export const botDataSource = new DataSource(createDataSourceOptions("bot"));
