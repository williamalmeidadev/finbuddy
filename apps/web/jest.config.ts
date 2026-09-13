import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
};

export default config;
