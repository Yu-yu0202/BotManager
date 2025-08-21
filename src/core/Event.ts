import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "discord.js";

import { Logger } from "./Logger.js";
import { ReadonlyUtil } from "../utils/Readonly.js";
import type { Events, AllReadonly } from "../types";

export class Event {
  private Client: Client;
  private events: Events[] = [];

  constructor(Client: Client) {
    this.Client = Client;
  }

  public async load(): Promise<AllReadonly<Events[]>> {
    return new Promise(async (resolve, _reject) => {
      Logger.log("Loading events...", "info");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const libRoot = path.resolve(__dirname, "..", "..");
      const appRoot = process.cwd();

      const candidateDirs = [
        path.resolve(appRoot, "events"),
        path.resolve(appRoot, "dist", "events"),
        path.resolve(appRoot, "src", "events"),
        path.resolve(libRoot, "events"),
        path.resolve(libRoot, "dist", "events"),
        path.resolve(libRoot, "src", "events"),
      ];

      const eventsDir = candidateDirs.find((d) => fs.existsSync(d));
      if (!eventsDir) {
        Logger.log(
          "Event directory does not exist. Skipping event load.",
          "warn",
        );
        resolve(ReadonlyUtil.toReadonly(this.events));
        return;
      }
      const useJs = eventsDir.includes(`${path.sep}dist${path.sep}`);
      const files = fs
        .readdirSync(eventsDir, { withFileTypes: true })
        .filter((f) => {
          if (!f.isFile()) return false;
          if (!f.name.endsWith(useJs ? ".js" : ".ts")) return false;
          if (f.name === "index.ts" || f.name === "index.js") return false;
          return true;
        })
        .map((f) => f.name);

      for (const file of files) {
        Logger.log(`Processing event file: ${file}`, "debug");
        const modulePath = path.resolve(eventsDir, file);
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
                `Failed to instantiate event class: ${file}: ${e instanceof Error ? e.message : "Unknown error"}`,
                "warn",
              );
              continue;
            }
            if (
              instance &&
              typeof instance.name === "string" &&
              typeof instance.exec === "function"
            ) {
              this.events.push(instance as Events);
              Logger.log(
                `✅️ Successfully loaded event ${instance.name}.`,
                "info",
              );
              found = true;
            }
          }
        }
        if (!found) {
          Logger.log(
            `No class implementing Events type found in event file ${file}.`,
            "warn",
          );
        }
      }

      Logger.log(`Loaded a total of ${this.events.length} events.`, "info");

      for (const event of this.events) {
        if (event.once) {
          this.Client.once(event.name, (...args) => event.exec(...args));
        } else {
          this.Client.on(event.name, (...args) => event.exec(...args));
        }
        Logger.log(
          `Registered event listener: ${event.name} (once: ${!!event.once})`,
          "debug",
        );
      }

      resolve(ReadonlyUtil.toReadonly(this.events));
    });
  }

  public get(): AllReadonly<Events[]> {
    return ReadonlyUtil.toReadonly(this.events);
  }

  public getEvent(name: string): Events | undefined {
    return this.events.find((evt) => evt.name === name);
  }
}
