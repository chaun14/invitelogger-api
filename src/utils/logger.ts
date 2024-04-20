import chalk from "chalk";

export enum Level {
  HTTP,
  INFO,
  WARN,
  ERROR,
}

const logger = (level: Level, ...args: any[]): void => {
  const formattedLevel = {
    [Level.HTTP]: chalk.magenta("[HTTP]"),
    [Level.INFO]: chalk.blue("[INFO]"),
    [Level.WARN]: chalk.yellow("[WARN]"),
    [Level.ERROR]: chalk.red("[ERROR]"),
  }[level];
  const formattedISO = chalk.cyan(`[${new Date().toISOString()}]`);

  console.log(`${formattedISO}  ${formattedLevel} `, ...args);
};

export default logger;
