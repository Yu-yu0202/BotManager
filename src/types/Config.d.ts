import { GatewayIntentBits } from "discord.js";

/**
 * Configuration type for the bot.
 * @typedef {Object} Config
 * @property {string} token - The bot's token for authentication.
 * @property {GatewayIntentBits[]} [intents] - Optional intents for the bot.
 * @property {Object} [options] - Optional configuration options.
 * @property {Object} [options.log] - Logging configuration.
 * @property {('verbose' | 'debug' | 'info' | 'warn' | 'error')} [options.log.logLevel] - The log level.
 * @property {boolean} [options.log.enable_console] - Whether to enable console logging.
 * @property {boolean} [options.log.enable_file] - Whether to enable file logging.
 * @property {string} [options.log.file_path] - The file path for logging.
 * @property {Object} [options.db] - Database configuration.
 * @property {('sqlite' | 'mysql')} options.db.type - The type of database.
 * @property {string} [options.db.host] - The database host.
 * @property {number} [options.db.port] - The database port.
 * @property {string} [options.db.user] - The database user.
 * @property {string} [options.db.password] - The database password.
 * @property {string} [options.db.database] - The database name for MySQL.
 * @property {string} [options.db.file] - The file path for SQLite database.
 * @property {Object} [options.feature] - Feature configuration.
 * @property {boolean} [options.feature.command_autoload] - Whether to autoload commands.
 * @property {boolean} [options.feature.event_autoload] - Whether to autoload events.
 * @property {boolean} [options.feature.enable_admin_commands] - Whether to enable admin commands.
 * @property {boolean} [options.feature.enable_dev_commands] - Whether to enable developer commands.
 * @example
 * const config: Config = {
 *   token: 'your-bot-token',
 *   intents: [GatewayIntentBits.Guilds],
 *   options: {
 *     log: {
 *       logLevel: 'info',
 *       enable_console: true,
 *       enable_file: true,
 *       file_path: 'logs/bot.log'
 *     },
 *     db: {
 *       type: 'sqlite',
 *       file: 'database/bot.db'
 *     },
 *     feature: {
 *       command_autoload: true,
 *       event_autoload: true,
 *       enable_admin_commands: true,
 *       enable_dev_commands: false
 *     }
 *   }
 * };
 */
export type ConfigType = {
  token: string;
  intents: GatewayIntentBits[];
  options?: {
    log?: {
      logLevel?: "verbose" | "debug" | "info" | "warn" | "error";
      enable_console?: boolean;
      enable_file?: boolean;
      file_path?: string;
    };
    db?: {
      type: "sqlite" | "mysql";
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      database?: string; // for mysql
      file?: string; // for sqlite
    };
    feature?: {
      command_autoload?: boolean;
      event_autoload?: boolean;
      enable_admin_commands?: boolean;
      enable_dev_commands?: boolean;
    };
  };
};
