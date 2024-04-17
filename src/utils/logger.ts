import chalk from "chalk";

export enum Level {
  Http,
  Info,
  Warn,
  Error,
}

const logger = (level: Level, ...args: any[]): void => {
  const formattedLevel = {
    [Level.Http]: chalk.magenta("[HTTP]"),
    [Level.Info]: chalk.blue("[INFO]"),
    [Level.Warn]: chalk.yellow("[WARN]"),
    [Level.Error]: chalk.red("[ERROR]"),
  }[level];
  const formattedISO = chalk.cyan(`[${new Date().toISOString()}]`);

  console.log(`${formattedISO}  ${formattedLevel} `, ...args);
};

export default logger;
