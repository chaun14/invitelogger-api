import { DataSource, DataSourceOptions } from "typeorm";

import config, { Environments } from "@config";

const createDataSourceOptions = (name: string): DataSourceOptions => ({
  type: "mysql",
  host: config.databases[name]["host"]!,
  port: config.databases[name]["port"]!,
  username: config.databases[name]["username"]!,
  password: config.databases[name]["password"]!,
  database: config.databases[name]["database"]!,
  synchronize: config.environment === Environments.Development,
  logging: ["error"],
  entities: [`src/entity/${name}/**/*.js`],
});

export const dashDataSource = new DataSource(createDataSourceOptions("dash"));
export const botDataSource = new DataSource(createDataSourceOptions("bot"));
