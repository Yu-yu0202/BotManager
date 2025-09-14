import type { ClientEvents } from "discord.js";

export type Events<K extends keyof ClientEvents = keyof ClientEvents> = {
  name: K;
  exec: (...args: ClientEvents[K]) => Promise<void> | void;
  once?: boolean;
};
