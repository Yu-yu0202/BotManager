import { Client, EmbedBuilder } from "discord.js";
import type { Guild, Interaction } from "discord.js";

import { Logger } from "./Logger.js";
import { Config } from "./Config.js";
import { Event } from "./Event.js";
import { Command } from "./Command.js";
import { Core } from "./index.js";

const deleteQueue: { interaction: any; at: number }[] = [];
function scheduleDelete(interaction: any, delayMs: number): void {
  deleteQueue.push({ interaction, at: Date.now() + delayMs });
}
setInterval(() => {
  const now = Date.now();
  for (let i = deleteQueue.length - 1; i >= 0; i--) {
    if (deleteQueue[i].at <= now) {
      const { interaction } = deleteQueue.splice(i, 1)[0];
      interaction?.deleteReply?.().catch(() => {});
    }
  }
}, 500);

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

    if (configData.options?.log?.logLevel === ("verbose" as const)) {
      this.client.on("debug", (info: string) => {
        Logger.log(`Client Debug: ${info}`, "verbose");
      });
    }

    const eventManager = new Event(this.client);

    await eventManager.load();

    Logger.log(`✅️ Loaded ${eventManager.get().length} events.`, "info");

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

    const commandManager = new Command(this.client);
    await commandManager.load();

    this.client.on("guildCreate", async (guild: Guild) => {
      Logger.log(
        `Joined new guild: ${guild.name}, register commands...`,
        "info",
      );
      const guildId = guild.id;
      await commandManager.load(guildId);
      Logger.log(
        `✅️Command registered to guild ${guild.name}(${guild.id}) successfully.`,
        "info",
      );
    });

    this.client.on(
      "interactionCreate",
      async <T extends Interaction>(interaction: T) => {
        if (interaction.isCommand()) {
          const command = commandManager.getCommand(interaction.commandName);
          if (!command) {
            Logger.log(`Unknown command: ${interaction.commandName}`, "warn");
          } else {
            try {
              const adminIds = Config.get().options?.adminuserid ?? [];
              const isAdmin =
                interaction.user && adminIds.includes(interaction.user.id);
              if (command.adminOnly && !isAdmin) {
                const embed = new EmbedBuilder()
                  .setTitle("🚫 Forbidden")
                  .setDescription("このコマンドは管理者専用です。")
                  .setColor("Red")
                  .setTimestamp();
                await interaction
                  .reply?.({ embeds: [embed], ephemeral: true })
                  .catch(() => {});
                return;
              }
              if (
                !commandManager.shouldExecCommand(
                  command.name,
                  interaction.user?.id,
                )
              ) {
                const embed = new EmbedBuilder()
                  .setTitle("⌛️ Throttled")
                  .setDescription(
                    "ちょっと待って！あなたの連打力にはまだ追いつけません…\n少し休憩してからもう一度どうぞ。🕒\n-# コマンドのクールダウンタイムが経過するまでお待ち下さい。",
                  )
                  .setColor("Aqua")
                  .setTimestamp();
                await interaction.reply?.({ embeds: [embed] }).catch(() => {});
                scheduleDelete(interaction, 3000);
                return;
              }
              await command.exec(interaction);
            } catch (error) {
              Logger.log(
                `Error executing command ${interaction.commandName}: ${error instanceof Error ? error.message : "Unknown error"}`,
                "error",
              );
            }
          }
        } else if (interaction.isAutocomplete()) {
          const command = commandManager.getCommand(interaction.commandName);
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
          const button = commandManager.getCommand(interaction.customId);
          if (!button) {
            Logger.log(
              `Unknown button interaction: ${interaction.customId}`,
              "warn",
            );
            return;
          }
          try {
            const adminIds = Config.get().options?.adminuserid ?? [];
            const isAdmin =
              interaction.user && adminIds.includes(interaction.user.id);
            if (button.adminOnly && !isAdmin) {
              const embed = new EmbedBuilder()
                .setTitle("🚫 Forbidden")
                .setDescription("このボタン操作は管理者専用です。")
                .setColor("Red")
                .setTimestamp();
              await interaction.reply?.({ embeds: [embed] }).catch(() => {});
              scheduleDelete(interaction, 3000);
              return;
            }
            if (
              !commandManager.shouldExecCommand(
                button.name,
                interaction.user?.id,
              )
            ) {
              const embed = new EmbedBuilder()
                .setTitle("⌛️ Throttled")
                .setDescription(
                  "ちょっと待って！あなたの連打力にはまだ追いつけません… 少し休憩してからもう一度どうぞ。🕒\n-# コマンドのクールダウンタイムが経過するまでお待ち下さい。",
                )
                .setColor("Aqua")
                .setTimestamp();
              await interaction.reply?.({ embeds: [embed] }).catch(() => {});
              scheduleDelete(interaction, 3000);
              return;
            }
            await button.exec(interaction);
          } catch (error) {
            Logger.log(
              `Error executing button interaction ${interaction.customId}: ${error instanceof Error ? error.message : "Unknown error"}`,
              "error",
            );
          }
        } else if (interaction.isModalSubmit()) {
          const modal = commandManager.getCommand(interaction.customId);
          if (!modal) {
            Logger.log(
              `Unknown modal interaction: ${interaction.customId}`,
              "warn",
            );
            return;
          }
          try {
            const adminIds = Config.get().options?.adminuserid ?? [];
            const isAdmin =
              interaction.user && adminIds.includes(interaction.user.id);
            if (modal.adminOnly && !isAdmin) {
              const embed = new EmbedBuilder()
                .setTitle("🚫 Forbidden")
                .setDescription("このモーダル操作は管理者専用です。")
                .setColor("Red")
                .setTimestamp();
              await interaction
                .reply?.({ embeds: [embed], ephemeral: true })
                .catch(() => {});
              return;
            }
            if (
              !commandManager.shouldExecCommand(
                modal.name,
                interaction.user?.id,
              )
            ) {
              const embed = new EmbedBuilder()
                .setTitle("⌛️ Throttled")
                .setDescription(
                  "ちょっと待って！あなたの連打力にはまだ追いつけません… 少し休憩してからもう一度どうぞ。🕒\n-# コマンドのクールダウンタイムが経過するまでお待ち下さい。",
                )
                .setColor("Aqua")
                .setTimestamp();
              await interaction.reply?.({ embeds: [embed] }).catch(() => {});
              scheduleDelete(interaction, 3000);
              return;
            }
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

    Logger.log(`✅️ Loaded ${commandManager.get().length} commands.`, "info");

    Logger.log("✅️ Commands registered successfully.", "info");

    Logger.log("✅️ Bot started successfully.", "info");
  }

  public static getClient(): Client {
    if (!this.client) {
      Core.fatal(new Error("Client is not initialized."));
    }
    return this.client!;
  }
}
