import fs from "fs";
import path from "path";

import { Logger } from "./Logger.js";
import { pathToFileURL } from "url";
import { ReadonlyUtil } from "../utils/Readonly.js";
import { defaultConfig } from "../include/config/defaultConfig.js";
import type { AllReadonly } from "#types";
import type { ConfigType } from "#types";

export class Config {
  private static instance: AllReadonly<ConfigType> | undefined = undefined;
  private static readonly configPaths: fs.PathLike[] = [
    path.resolve(process.cwd(), "config", "config.ts"),
    path.resolve(process.cwd(), "config", "config.js"),
  ];

  private static validateConfig(config: ConfigType): void {
    if (!config.token || config.token.trim() === "") {
      throw new Error(
        "Bot token is required. Set it in config or DISCORD_TOKEN.",
      );
    }
    if (config.intents?.length === 0) {
      throw new Error("intents cannot be empty.");
    }

    if (config.options?.log?.enable_file && !config.options.log.file_path) {
      throw new Error(
        "Log file path is required when file logging is enabled.",
      );
    }

    if (config.options?.db?.type === "sqlite" && !config.options?.db?.file) {
      throw new Error("DB file path is required for SQLite.");
    } else if (config.options?.db?.type === "mysql") {
      if (
        !config.options?.db?.host ||
        !config.options?.db?.port ||
        !config.options?.db?.user ||
        !config.options?.db?.password ||
        !config.options?.db?.database
      ) {
        const dbFields = ["host", "user", "password", "database"] as const;
        const missing = dbFields.filter((f) => !config.options?.db?.[f]);

        throw new Error(
          `DB settings are incomplete. Missing: ${missing.join(", ")}`,
        );
      }
    }

    if (config.options?.feature?.enable_dev_commands) {
      Logger.log(
        "Commands for development environments are enabled. Are they really necessary?",
        "warn",
      );
    }
  }

  public static async load(): Promise<AllReadonly<ConfigType>> {
    if (this.instance) {
      return this.instance;
    }

    const foundPath = this.configPaths.find((p) => fs.existsSync(p));
    if (!foundPath) {
      throw new Error(
        `Configuration file not found. Expected one of: ${this.configPaths.join(", ")}`,
      );
    }

    let userModule: Record<string, unknown>;
    try {
      const fileUrl: string = pathToFileURL(foundPath.toString()).href;
      userModule = await import(fileUrl);
    } catch (e) {
      throw new Error(
        `Failed to import configuration module: ${foundPath}. ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }

    const exportedConfig =
      (userModule as any).Config ??
      (userModule as any).default ??
      (userModule as any).config;
    if (!exportedConfig || typeof exportedConfig !== "object") {
      throw new Error(
        `Configuration module must export an object as 'Config' or default export. Path: ${foundPath}`,
      );
    }

    const userConfig = exportedConfig as ConfigType;

    function mergeConfig<T extends object>(user: Partial<T>, def: T): T {
      if (typeof def !== "object" || def === null) return (user ?? def) as T;
      if (Array.isArray(def)) return (user ?? def) as T;

      const result = {} as T;

      for (const key of Object.keys(def) as Array<keyof T>) {
        if (user && Object.prototype.hasOwnProperty.call(user, key)) {
          if (
            typeof user[key] === "object" &&
            user[key] !== null &&
            typeof def[key] === "object" &&
            def[key] !== null &&
            !Array.isArray(def[key])
          ) {
            result[key] = mergeConfig(user[key] as any, def[key]);
          } else {
            result[key] = (
              user[key] !== undefined ? user[key] : def[key]
            ) as T[typeof key];
          }
        } else {
          result[key] = def[key];
        }
      }
      if (user) {
        for (const key of Object.keys(user) as Array<keyof T>) {
          if (!Object.prototype.hasOwnProperty.call(result, key)) {
            result[key] = user[key] as T[typeof key];
          }
        }
      }
      return result;
    }

    const config: ConfigType = mergeConfig<ConfigType>(
      userConfig as Partial<ConfigType>,
      defaultConfig as ConfigType,
    );

    this.validateConfig(config);
    this.instance = ReadonlyUtil.toReadonly(config);
    Logger.setLogLevel(config.options?.log?.logLevel || "info");

    return this.instance;
  }

  public static get(): AllReadonly<ConfigType> {
    if (!this.instance) {
      throw new Error(
        "Config has not been loaded yet. Call Config.load() first.",
      );
    }
    return this.instance;
  }

  public static async reload(): Promise<AllReadonly<ConfigType>> {
    this.instance = undefined;
    return await this.load();
  }
}
