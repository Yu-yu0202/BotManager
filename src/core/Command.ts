import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ApplicationCommandDataResolvable, Guild } from "discord.js";
import {
  Client,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { Logger } from "./Logger.js";
import { Config } from "./Config.js";
import type { AllReadonly, CommandMeta } from "#types";

export class Command {
  private static instance: Command | undefined = undefined;
  private Client: Client;
  private commands: CommandMeta[] = [];
  private cooldown: {
    commandName: string;
    global: boolean;
    user?: string;
    seconds: number;
    lastUsed: string;
  }[] = [];

  constructor(Client: Client) {
    this.Client = Client;
    Command.instance = this;
  }

  public static getInstance(): Command {
    if (!this.instance) {
      throw new Error("Command handler is not initialized yet.");
    }
    return this.instance;
  }

  public async load(guildid?: string): Promise<AllReadonly<CommandMeta[]>> {
    try {
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
        return this.commands.slice() as AllReadonly<CommandMeta[]>;
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

      const config = Config.get();
      const enableDev = !!config?.options?.feature?.enable_dev_commands;
      const enableAdmin = !!config?.options?.feature?.enable_admin_commands;

      if (enableDev) {
        await this.loadHotswapCommand();
      }

      for (const file of files) {
        if (enableDev && file.toLowerCase().includes("hotswap")) {
          continue;
        }
        await this.loadCommandFromFile(
          file,
          commandsDir,
          enableDev,
          enableAdmin,
        );
      }

      Logger.log(`Loaded ${this.commands.length} commands.`, "info");

      if (!guildid) {
        await this.registerSlashCommands();
      } else {
        await this.registerSlashCommandsWithGuildId(guildid);
      }
      return this.commands.slice() as AllReadonly<CommandMeta[]>;
    } catch (error) {
      Logger.log(
        `Critical error during command loading: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
      return this.commands.slice() as AllReadonly<CommandMeta[]>;
    }
  }

  private async loadHotswapCommand(): Promise<void> {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const hotswapPath = path.resolve(
        __dirname,
        "../include/command/Hotswap.js",
      );
      const HotSwapModule = await import(pathToFileURL(hotswapPath).href);

      let loaded = false;
      for (const key of Object.keys(HotSwapModule)) {
        const exported = (HotSwapModule as any)[key];
        if (this.isClassConstructor(exported)) {
          const instance = await this.createCommandInstance(
            exported,
            "Hotswap.js",
          );
          if (instance && this.isValidCommandInstance(instance)) {
            this.addOrUpdateCommand(instance);
            loaded = true;
            break;
          }
        }
      }

      if (!loaded) {
        Logger.log("Hotswap class not found in module", "warn");
      }
    } catch (error) {
      Logger.log(
        `Failed to load Hotswap command: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "warn",
      );
    }
  }

  private async loadCommandFromFile(
    file: string,
    commandsDir: string,
    enableDev: boolean,
    enableAdmin: boolean,
  ): Promise<void> {
    try {
      Logger.log(`Processing ${file}`, "debug");
      const modulePath = path.resolve(commandsDir, file);
      const module = await import(pathToFileURL(modulePath).href);

      let found = false;
      for (const key of Object.keys(module)) {
        const exported = module[key];
        if (this.isClassConstructor(exported)) {
          const instance = await this.createCommandInstance(exported, file);
          if (
            instance &&
            this.shouldLoadCommand(instance, enableDev, enableAdmin)
          ) {
            this.addOrUpdateCommand(instance);
            found = true;
          }
        }
      }

      if (!found) {
        Logger.log(`No valid command class found in ${file}`, "warn");
      }
    } catch (error) {
      Logger.log(
        `Failed to load command file ${file}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "warn",
      );
    }
  }

  private isClassConstructor(exported: any): boolean {
    return (
      typeof exported === "function" &&
      /^class\s/.test(Function.prototype.toString.call(exported))
    );
  }

  private async createCommandInstance(
    CommandClass: any,
    file: string,
  ): Promise<any> {
    try {
      return new CommandClass();
    } catch (error) {
      Logger.log(
        `Failed to instantiate command class in ${file}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "warn",
      );
      return null;
    }
  }

  private isValidCommandInstance(instance: any): boolean {
    return (
      instance &&
      typeof instance.name === "string" &&
      typeof instance.description === "string" &&
      typeof instance.exec === "function" &&
      typeof instance.type === "string"
    );
  }

  private shouldLoadCommand(
    instance: any,
    enableDev: boolean,
    enableAdmin: boolean,
  ): boolean {
    if (!this.isValidCommandInstance(instance)) {
      return false;
    }

    if (instance.devOnly && !enableDev) {
      return false;
    }

    if (instance.adminOnly && !enableAdmin) {
      return false;
    }

    return true;
  }

  public shouldExecCommand(CN: string, user?: string): boolean {
    const CommandInfo: CommandMeta | undefined = this.commands.find(
      (d) => d.name === CN,
    );
    if (!CommandInfo) return false;

    if (!CommandInfo.cooldown || CommandInfo.cooldown <= 0) return true;

    const isGlobal = !!(CommandInfo.isglobalcooldown ?? false);

    const cfg = Config.get();
    const admins: readonly string[] | undefined = cfg.options?.adminuserid;
    const isAdminUser = !!(
      user &&
      Array.isArray(admins) &&
      admins.includes(user)
    );

    if (isAdminUser) {
      const now = Date.now();
      if (isGlobal) {
        const entry = this.cooldown.find(
          (c) => c.commandName === CN && c.global === true,
        );
        if (!entry) {
          this.cooldown.push({
            commandName: CN,
            global: true,
            user: undefined,
            seconds: CommandInfo.cooldown,
            lastUsed: new Date(now).toISOString(),
          });
        } else {
          entry.seconds = CommandInfo.cooldown;
          entry.lastUsed = new Date(now).toISOString();
        }
      }
      return true;
    }

    if (!isGlobal && !user) return true;

    const now = Date.now();
    const entry = this.cooldown.find(
      (c) =>
        c.commandName === CN &&
        c.global === isGlobal &&
        (isGlobal ? true : c.user === user),
    );

    if (!entry) {
      this.cooldown.push({
        commandName: CN,
        global: isGlobal,
        user: isGlobal ? undefined : user,
        seconds: CommandInfo.cooldown,
        lastUsed: new Date(now).toISOString(),
      });
      return true;
    }

    const last = new Date(entry.lastUsed).getTime();
    const elapsedSec = Math.max(0, Math.floor((now - last) / 1000));
    const requiredSec = entry.seconds ?? CommandInfo.cooldown;

    if (elapsedSec >= requiredSec) {
      entry.seconds = CommandInfo.cooldown;
      entry.lastUsed = new Date(now).toISOString();
      return true;
    }

    return false;
  }

  private addOrUpdateCommand(instance: CommandMeta): void {
    const existingIndex = this.commands.findIndex(
      (cmd) => cmd.name === instance.name,
    );

    if (existingIndex !== -1) {
      this.commands[existingIndex] = instance;
      Logger.log(`✅️ Command ${instance.name} reloaded (overwritten).`, "info");
    } else {
      this.commands.push(instance);
      Logger.log(`✅ Command ${instance.name} loaded successfully.`, "info");
    }
  }

  private async registerSlashCommands(): Promise<void> {
    const slashCommands = this.commands.filter((cmd) => cmd.type === "slash");
    const meta: ApplicationCommandDataResolvable[] = slashCommands.map((cmd) =>
      this.buildSlashCommandMeta(cmd),
    );

    const guilds = Array.from(this.Client.guilds.cache.values());
    const registrationPromises = guilds.map(async (guild) => {
      try {
        Logger.log(`Registering commands for guild: ${guild.id}`, "info");
        await guild.commands.set(meta);
        Logger.log(
          `✅ Commands registered successfully for guild: ${guild.id}`,
          "info",
        );
      } catch (error) {
        Logger.log(
          `Failed to register commands for guild ${guild.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "error",
        );
      }
    });

    await Promise.allSettled(registrationPromises);
  }

  private async registerSlashCommandsWithGuildId(
    guildid: string,
  ): Promise<void> {
    const slashCommands = this.commands.filter((cmd) => cmd.type === "slash");
    const meta: ApplicationCommandDataResolvable[] = slashCommands.map((cmd) =>
      this.buildSlashCommandMeta(cmd),
    );

    const guild: Guild | undefined = this.Client.guilds.cache.get(guildid);
    if (!guild) {
      Logger.log(`Guild not found: ${guildid}`, "error");
      return;
    }

    await guild.commands.set(meta).catch((error) => {
      Logger.log(
        `Failed to register commands for guild ${guildid}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
      );
    });
  }

  private buildSlashCommandMeta(
    cmd: CommandMeta,
  ): ApplicationCommandDataResolvable {
    switch (cmd.type) {
      case "slash":
        const Sbuilder = new SlashCommandBuilder()
          .setName(cmd.name)
          .setDescription(cmd.description);
        if (Array.isArray(cmd.options)) {
          for (const opt of cmd.options) {
            if (!this.isValidOption(opt)) continue;

            const desc =
              typeof opt.description === "string"
                ? opt.description
                : "No description";
            this.addOptionToBuilder(Sbuilder, opt, desc);
          }
        }
        return Sbuilder.toJSON();
      case "context":
        const Cbuilder = new ContextMenuCommandBuilder().setName(cmd.name);
        return Cbuilder.toJSON();
    }
  }

  private isValidOption(opt: any): boolean {
    return (
      opt &&
      typeof opt === "object" &&
      opt.name &&
      typeof opt.name === "string" &&
      opt.type
    );
  }

  private addOptionToBuilder(
    builder: SlashCommandBuilder,
    opt: any,
    description: string,
  ): void {
    const baseConfig = {
      name: opt.name,
      description,
      required: !!opt.required,
    };

    switch (opt.type) {
      case "string":
        builder.addStringOption((option) => {
          let o = option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required);

          if (Array.isArray(opt.choices)) {
            o = o.setChoices(...this.formatChoices(opt.choices));
          }
          return o;
        });
        break;
      case "number":
        builder.addNumberOption((option) => {
          let o = option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required);

          if (Array.isArray(opt.choices)) {
            o = o.setChoices(...this.formatChoices(opt.choices));
          }
          return o;
        });
        break;
      case "boolean":
        builder.addBooleanOption((option) =>
          option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required),
        );
        break;
      case "user":
        builder.addUserOption((option) =>
          option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required),
        );
        break;
      case "channel":
        builder.addChannelOption((option) =>
          option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required),
        );
        break;
      case "role":
        builder.addRoleOption((option) =>
          option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required),
        );
        break;
      case "mentionable":
        builder.addMentionableOption((option) =>
          option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required),
        );
        break;
      case "attachment":
        builder.addAttachmentOption((option) =>
          option
            .setName(baseConfig.name)
            .setDescription(baseConfig.description)
            .setRequired(baseConfig.required),
        );
        break;
      default:
        Logger.log(`Unknown option type: ${opt.type}`, "warn");
        break;
    }
  }

  private formatChoices(choices: any[]): Array<{ name: string; value: any }> {
    return choices.map((c: any) =>
      typeof c === "object" && c.name && c.value
        ? { name: c.name, value: c.value }
        : { name: String(c), value: c },
    );
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
