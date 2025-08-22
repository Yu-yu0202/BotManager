import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  Client,
  ApplicationCommandDataResolvable,
  SlashCommandBuilder,
} from "discord.js";

import { Logger } from "./Logger.js";
import { Config } from "./Config.js";
import type { AllReadonly, CommandMeta } from "../types";

export class Command {
  private Client: Client;
  private commands: CommandMeta[] = [];

  constructor(Client: Client) {
    this.Client = Client;
  }

  public async load(): Promise<AllReadonly<CommandMeta[]>> {
    return new Promise(async (resolve, _reject) => {
      Logger.log("Loading commands...", "info");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const libRoot = path.resolve(__dirname, "..", "..");
      const appRoot = process.cwd();

      const candidateDirs = [
        path.resolve(appRoot, "commands"),
        path.resolve(appRoot, "dist", "commands"),
        path.resolve(appRoot, "src", "commands"),
        path.resolve(libRoot, "commands"),
        path.resolve(libRoot, "dist", "commands"),
        path.resolve(libRoot, "src", "commands"),
      ];

      const commandsDir = candidateDirs.find((d) => fs.existsSync(d));
      if (!commandsDir) {
        Logger.log(
          "Command directory does not exist. Skipping command load.",
          "warn",
        );
        resolve(this.commands.slice() as AllReadonly<CommandMeta[]>);
        return;
      }

      const useJs = commandsDir.includes(`${path.sep}dist${path.sep}`);
      const files = fs
        .readdirSync(commandsDir, { withFileTypes: true })
        .filter((f) => {
          if (!f.isFile()) return false;
          if (!f.name.endsWith(useJs ? ".js" : ".ts")) return false;
          if (f.name === "index.ts" || f.name === "index.js") return false;
          return true;
        })
        .map((f) => f.name);

      for (const file of files) {
        Logger.log(`processing ${file}`, "debug");
        const modulePath = path.resolve(commandsDir, file);
        const module = await import(pathToFileURL(modulePath).href);
        let found: boolean = false;
        for (const key of Object.keys(module)) {
          const exported = module[key];
          if (
            typeof exported === "function" &&
            /^class\s/.test(Function.prototype.toString.call(exported))
          ) {
            let instance;
            try {
              instance = new exported();
            } catch (e) {
              Logger.log(
                `Failed to instantiate command class in ${file}: ${
                  e instanceof Error ? e.message : "Unknown error"
                }`,
                "warn",
              );
              continue;
            }
            if (
              instance &&
              typeof instance.name === "string" &&
              typeof instance.description === "string" &&
              typeof instance.exec === "function" &&
              typeof instance.type === "string" &&
              (
                ((Config.get()!["options"]!["feature"]!["enable_dev_commands"]! && instance.devOnly) || !instance.devOnly)
              )
              &&
              (
                ((Config.get()!["options"]!["feature"]!["enable_admin_commands"]! && instance.adminOnly) || !instance.adminOnly)
              )
            ) {
              const existingIndex = this.commands.findIndex(
                (cmd) => cmd.name === instance.name,
              );
              if (existingIndex !== -1) {
                this.commands[existingIndex] = instance as CommandMeta;
                Logger.log(
                  `[Command.load()] ♻️ Command ${instance.name} reloaded (overwritten).`,
                  "warn",
                );
              } else {
                this.commands.push(instance as CommandMeta);
                Logger.log(
                  `✅️ Command ${instance.name} loaded successfully.`,
                  "info",
                );
              }
              found = true;
            }
          }
        }
        if (!found) {
          Logger.log(
            `No class implementing CommandMeta found in command file ${file}.`,
            "warn",
          );
        }
      }

      Logger.log(`Loaded ${this.commands.length} commands.`, "info");

      const meta: ApplicationCommandDataResolvable[] = this.commands
        .filter((cmd) => cmd.type === "slash")
        .map((cmd) => {
          const builder = new SlashCommandBuilder()
            .setName(cmd.name)
            .setDescription(cmd.description);

          if (Array.isArray(cmd.options)) {
            for (const opt of cmd.options) {
              if (
                !opt ||
                typeof opt !== "object" ||
                !opt.name ||
                typeof opt.name !== "string" ||
                !opt.type
              )
                continue;
              const desc =
                typeof opt.description === "string"
                  ? opt.description
                  : "No description";
              switch (opt.type) {
                case "string":
                  builder.addStringOption((option) => {
                    let o = option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required);
                    if (Array.isArray(opt.choices)) {
                      o = o.setChoices(
                        ...opt.choices.map((c: any) =>
                          typeof c === "object" && c.name && c.value
                            ? { name: c.name, value: c.value }
                            : { name: String(c), value: c },
                        ),
                      );
                    }
                    return o;
                  });
                  break;
                case "number":
                  builder.addNumberOption((option) => {
                    let o = option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required);
                    if (Array.isArray(opt.choices)) {
                      o = o.setChoices(
                        ...opt.choices!.map((c: any) =>
                          typeof c === "object" && c.name && c.value
                            ? { name: c.name, value: c.value }
                            : { name: String(c), value: c },
                        ),
                      );
                    }
                    return o;
                  });
                  break;
                case "boolean":
                  builder.addBooleanOption((option) =>
                    option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required),
                  );
                  break;
                case "user":
                  builder.addUserOption((option) =>
                    option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required),
                  );
                  break;
                case "channel":
                  builder.addChannelOption((option) =>
                    option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required),
                  );
                  break;
                case "role":
                  builder.addRoleOption((option) =>
                    option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required),
                  );
                  break;
                case "mentionable":
                  builder.addMentionableOption((option) =>
                    option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required),
                  );
                  break;
                case "attachment":
                  builder.addAttachmentOption((option) =>
                    option
                      .setName(opt.name)
                      .setDescription(desc)
                      .setRequired(!!opt.required),
                  );
                  break;
                default:
                  break;
              }
            }
          }

          return builder.toJSON();
        });

      for (const guild of this.Client.guilds.cache.values()) {
        const guildId = guild.id;
        Logger.log(`Registering commands for guild: ${guildId}`, "info");
        try {
          await guild.commands.set(meta);
          Logger.log(
            `✅️ Commands registered successfully for guild: ${guildId}`,
            "info",
          );
        } catch (error) {
          Logger.log(
            `Failed to register commands for guild ${guildId}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            "error",
          );
        }
      }

      resolve(this.commands.slice() as AllReadonly<CommandMeta[]>);
    });
  }

  public get(): AllReadonly<CommandMeta[]> {
    return this.commands.slice() as AllReadonly<CommandMeta[]>;
  }

  public getCommand(name: string): CommandMeta | undefined {
    return this.commands.find((cmd) => cmd.name === name);
  }

  public unload(name: string): boolean {
    const index = this.commands.findIndex((cmd) => cmd.name === name);
    if (index === -1) return false;
    this.commands.splice(index, 1);
    Logger.log(`✅️ Command ${name} unloaded successfully.`, "info");
    return true;
  }

  public unloadAll(): void {
    this.commands = [];
    Logger.log("✅️ All commands unloaded successfully.", "info");
  }

  public reload(name: string): boolean {
    const command = this.getCommand(name);
    if (!command) {
      Logger.log(`Command ${name} not found.`, "warn");
      return false;
    }
    this.unload(name);
    this.load().then(() => {
      Logger.log(`✅️ Command ${name} reloaded successfully.`, "info");
    });
    return true;
  }
}
