module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  transform: {
    "^.+\\.tsx?$": [
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
  clearMocks: true,
};
