import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: [
        "<rootDir>/services",
    ],
    testMatch: [
        "**/*.test.ts",
        "**/*.spec.ts",
    ],
    moduleFileExtensions: ["ts", "js", "json"],
    collectCoverageFrom: [
        "services/*/src/**/*.ts",
        "!services/*/src/index.ts",
        "!**/*.d.ts",
    ],
};

export default config;
