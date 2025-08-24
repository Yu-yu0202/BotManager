import { GatewayIntentBits } from "discord.js";
import type { ConfigType } from "../types";

/**
 * @type {Config}
 * @description Default configuration for the Discord bot.
 */
export const defaultConfig: ConfigType = {
  token: process.env.DISCORD_TOKEN || "",
  intents: [GatewayIntentBits.Guilds],
  options: {
    log: {
      logLevel: "info",
      enable_console: true,
      enable_file: false,
      file_path: "logs/bot.log",
    },
    db: {
      type: "sqlite",
      file: "database/bot.db",
      host: "localhost",
      port: 3306,
      user: "root",
      password: "",
      database: "botmanager",
    },
    feature: {
      command_autoload: true,
      event_autoload: true,
      enable_admin_commands: true,
      enable_dev_commands: false,
    },
  },
};
