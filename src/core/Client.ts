import { Client, Interaction } from "discord.js";

import { Logger } from "./Logger.js";
import { Config } from "./Config.js";
import { Event } from "./Event.js";
import { Command } from "./Command.js";
import { Core } from "./index.js";

export class BotManager {
  private static client: Client | undefined = undefined;

  public static async start() {
    if (this.client) {
      Logger.log("Client is already initialized.", "warn");
      return;
    }

    Logger.log("Starting Bot...", "info");

    const configData = await Config.load();
    this.client = new Client({
      intents: configData.intents,
    });

    this.client.once("clientReady", () => {
      Logger.log(`✅️ Logged in as ${this.client?.user?.tag}`, "info");
    });

    this.client.on("error", (error: Error) => {
      Logger.log(`Client Error: ${error.message}`, "error");
    });

    const eventHandler = new Event(this.client);

    await eventHandler.load();

    Logger.log(`✅️ Loaded ${eventHandler.get().length} events.`, "info");

    Logger.log("✅️ Events registered successfully.", "info");

    try {
      await this.client.login(configData.token);
    } catch (error) {
      Core.fatal(
        new Error(
          `Failed to login: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      this.client?.destroy();
    }

    const commandHandler = new Command(this.client);
    await commandHandler.load();

    this.client.on(
      "interactionCreate",
      async <T extends Interaction>(interaction: T) => {
        if (interaction.isCommand()) {
          const command = commandHandler.getCommand(interaction.commandName);
          if (!command) {
            Logger.log(`Unknown command: ${interaction.commandName}`, "warn");
          } else {
            try {
              await command.exec(interaction);
            } catch (error) {
              Logger.log(
                `Error executing command ${interaction.commandName}: ${error instanceof Error ? error.message : "Unknown error"}`,
                "error",
              );
            }
          }
        } else if (interaction.isAutocomplete()) {
          const command = commandHandler.getCommand(interaction.commandName);
          if (command && command.autocomplete) {
            try {
              await command.autocomplete(interaction);
            } catch (error) {
              Logger.log(
                `Error in autocomplete for command ${interaction.commandName}: ${error instanceof Error ? error.message : "Unknown error"}`,
                "error",
              );
            }
          } else {
            Logger.log(
              `No autocomplete function for command: ${interaction.commandName}`,
              "warn",
            );
          }
        } else if (interaction.isButton()) {
          const button = commandHandler.getCommand(interaction.customId);
          if (!button) {
            Logger.log(
              `Unknown button interaction: ${interaction.customId}`,
              "warn",
            );
            return;
          }
          try {
            await button.exec(interaction);
          } catch (error) {
            Logger.log(
              `Error executing button interaction ${interaction.customId}: ${error instanceof Error ? error.message : "Unknown error"}`,
              "error",
            );
          }
        } else if (interaction.isModalSubmit()) {
          const modal = commandHandler.getCommand(interaction.customId);
          if (!modal) {
            Logger.log(
              `Unknown modal interaction: ${interaction.customId}`,
              "warn",
            );
            return;
          }
          try {
            await modal.exec(interaction);
          } catch (error) {
            Logger.log(
              `Error executing modal interaction ${interaction.customId}: ${error instanceof Error ? error.message : "Unknown error"}`,
              "error",
            );
          }
        }
      },
    );

    Logger.log(`✅️ Loaded ${commandHandler.get().length} commands.`, "info");

    Logger.log("✅️ Commands registered successfully.", "info");

    Logger.log("✅️ Bot started successfully.", "info");
  }
}
