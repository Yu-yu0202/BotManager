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

  public static setLogLevel(
    level: "verbose" | "debug" | "info" | "warn" | "error",
  ): void {
    this.currentLogLevel = level;
  }

  public static log(
    message: string,
    level: "verbose" | "debug" | "info" | "warn" | "error" | "fatal" = "info",
  ): void {
    const timestamp = new Date().toISOString();

    const resetColor = "\x1b[0m";
    const color = this.levelColors[level] || "";
    const formattedMessage = `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${resetColor}`;

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
      console.log(formattedMessage);
      if (level === "fatal") {
        process.exit(1);
      }
    }
  }
}
