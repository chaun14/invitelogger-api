module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.cjs"],
  clearMocks: true,
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: {
          module: "commonjs",
          target: "es2020",
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@controllers/(.*)\\.js$": "<rootDir>/src/controllers/$1.ts",
    "^@entity/(.*)\\.js$": "<rootDir>/src/entity/$1.ts",
    "^@middlewares/(.*)\\.js$": "<rootDir>/src/middlewares/$1.ts",
    "^@routes/(.*)\\.js$": "<rootDir>/src/routes/$1.ts",
    "^@utils/(.*)\\.js$": "<rootDir>/src/utils/$1.ts",
    "^@config/orm$": "<rootDir>/config/ormconfig.ts",
    "^@config$": "<rootDir>/config/config.ts",
  },
};
