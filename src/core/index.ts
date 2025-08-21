import { Logger } from "./Logger.js";

export class Core {
  public static fatal(error: Error): void {
    this.HandleFatalError(error);
  }

  private static HandleFatalError(error: Error): void {
    Logger.log(`Bot Crashed! ${error.message}`, "fatal");
    process.exit(1);
  }
}

export { Logger } from "./Logger.js";
export { Config } from "./Config.js";
export { Command } from "./Command.js";
export { Event } from "./Event.js";
export { BotManager } from "./Client.js";
