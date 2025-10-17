import fs from "fs";
import path from "path";
import { Config } from "./Config.js";

export class Logger {
  private static readonly levelColors: Record<string, string> = {
    verbose: "\x1b[37m",
    debug: "\x1b[36m",
    info: "\x1b[32m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
    fatal: "\x1b[41m\x1b[37m",
  };

  private static currentLogLevel:
    | "verbose"
    | "debug"
    | "info"
    | "warn"
    | "error" = "info";

  private static getLogPath(): string | undefined {
    try {
      return Config.get().options?.log?.file_path;
    } catch {
      return undefined;
    }
  }

  private static getIsFileLogEnabled(): boolean {
    try {
      return !!Config.get().options?.log?.enable_file;
    } catch {
      return false;
    }
  }

  public static setLogLevel(
    level: "verbose" | "debug" | "info" | "warn" | "error",
  ): void {
    this.currentLogLevel = level;
  }

  private static toFile(
    message: string,
    level: "verbose" | "debug" | "info" | "warn" | "error" | "fatal" = "info",
  ): void {
    if (!this.getIsFileLogEnabled()) return;
    const timestamp: string = new Date().toISOString();
    const logPath = this.getLogPath();
    if (logPath && this.getIsFileLogEnabled()) {
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const plainMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      fs.appendFileSync(logPath, plainMessage, "utf8");
    }
  }

  public static log(
    message: string,
    level: "verbose" | "debug" | "info" | "warn" | "error" | "fatal" = "info",
  ): void {
    const timestamp = new Date().toISOString();

    const resetColor = "\x1b[0m";
    const color = this.levelColors[level] || "";
    const formattedMessage = `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${resetColor}\n`;

    const isLoggable = (
      level: "verbose" | "debug" | "info" | "warn" | "error" | "fatal",
    ): boolean => {
      const levels = ["verbose", "debug", "info", "warn", "error"];
      return (
        levels.indexOf(level) >= levels.indexOf(this.currentLogLevel) ||
        level === "fatal"
      );
    };

    if (isLoggable(level)) {
      process.stdout.write(formattedMessage);
      this.toFile(message, level);
      if (level === "fatal") {
        process.exit(1);
      }
    }
  }
}
