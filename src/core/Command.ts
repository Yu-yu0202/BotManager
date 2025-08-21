import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  Client,
  ApplicationCommandDataResolvable,
  SlashCommandBuilder,
} from "discord.js";

import { Logger } from "./Logger.js";
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
              typeof instance.type === "string"
            ) {
              this.commands.push(instance as CommandMeta);
              Logger.log(
                `✅️ Command ${instance.name} loaded successfully.`,
                "info",
              );
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
          return new SlashCommandBuilder()
            .setName(cmd.name)
            .setDescription(cmd.description)
            .toJSON();
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
}
