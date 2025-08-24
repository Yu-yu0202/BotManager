declare module "botmanager" {
  export type { ConfigType } from "./Config.js";
  export type { AllReadonly } from "./Readonly.js";
  export type { CommandMeta } from "./Commands.js";
  export type { Events } from "./Events.js";

  export class BotWindow {
    static start(): Promise<void>;
  }

  export class Core {
    static fatal(error: Error): void;
  }

  export class Logger {
    static log(
      message: string,
      level?: "verbose" | "debug" | "info" | "warn" | "error" | "fatal",
    ): void;
  }

  export class Config {
    static load(): Promise<
      import("./Readonly.js").AllReadonly<import("./Config.js").Config>
    >;
    static get(): import("./Readonly.js").AllReadonly<
      import("./Config.js").Config
    >;
    static reload(): Promise<
      import("./Readonly.js").AllReadonly<import("./Config.js").Config>
    >;
  }

  export class Event {
    constructor(client: any);
    load(): Promise<
      import("./Readonly.js").AllReadonly<import("./Events.js").Events[]>
    >;
    get(): import("./Readonly.js").AllReadonly<import("./Events.js").Events[]>;
    getEvent(name: string): import("./Events.js").Events | undefined;
  }

  export class Command {
    constructor(client: any);
    load(): Promise<
      import("./Readonly.js").AllReadonly<import("./Commands.js").CommandMeta[]>
    >;
    get(): import("./Readonly.js").AllReadonly<
      import("./Commands.js").CommandMeta[]
    >;
    getCommand(name: string): import("./Commands.js").CommandMeta | undefined;
  }
}

export type { ConfigType } from "./Config.js";
export type { AllReadonly } from "./Readonly.js";
export type { CommandMeta } from "./Commands.js";
export type { Events } from "./Events.js";

export class BotManager {
  static start(): Promise<void>;
}

export class Core {
  static fatal(error: Error): void;
}

export class Logger {
  static log(
    message: string,
    level?: "verbose" | "debug" | "info" | "warn" | "error" | "fatal",
  ): void;
}

export class Config {
  static load(): import("./Readonly.js").AllReadonly<
    import("./Config.js").Config
  >;
  static get(): import("./Readonly.js").AllReadonly<
    import("./Config.js").Config
  >;
  static reload(): import("./Readonly.js").AllReadonly<
    import("./Config.js").Config
  >;
}

export class Event {
  constructor(client: any);
  load(): Promise<
    import("./Readonly.js").AllReadonly<import("./Events.js").Events[]>
  >;
  get(): import("./Readonly.js").AllReadonly<import("./Events.js").Events[]>;
  getEvent(name: string): import("./Events.js").Events | undefined;
}

export class Command {
  constructor(client: any);
  load(): Promise<
    import("./Readonly.js").AllReadonly<import("./Commands.js").CommandMeta[]>
  >;
  get(): import("./Readonly.js").AllReadonly<
    import("./Commands.js").CommandMeta[]
  >;
  getCommand(name: string): import("./Commands.js").CommandMeta | undefined;
}
