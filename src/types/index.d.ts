import type { Client } from "discord.js";
declare module "botmanager" {
  export type { ConfigType } from "./Config.js";
  export type { AllReadonly } from "./Readonly.js";
  export type { CommandMeta } from "./Commands.js";
  export type { Events } from "./Events.js";

  export class BotManager {
    static start(): Promise<void>;
    static getClient(): Client;
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

  export class DatabaseManager {
    private dbconfig: any;
    private db: any;

    constructor();

    private initializeMySQL(): Promise<void>;
    private ensureReady(): Promise<void>;

    public query<T = Record<string, any>>(
      sql: string,
      params?: any[],
    ): Promise<T[]>;
    public get<T = Record<string, any>>(
      sql: string,
      params?: any[],
    ): Promise<T | undefined>;
    public run(sql: string, params?: any[]): Promise<any>;
    public queue(sql: string, params?: any[]): this;
    public commit(): Promise<this>;
    public rollback(): Promise<void>;
    public savepoint(name?: string): Promise<string>;
    public releaseSavepoint(name: string): Promise<void>;
    public rollbackToSavepoint(name: string): Promise<void>;
    public tableExists(tableName: string): Promise<boolean>;
    public close(): Promise<void>;
    public getType(): "sqlite" | "mysql";
    public getConfig(): any;
  }
}

export type { ConfigType } from "./Config.js";
export type { AllReadonly } from "./Readonly.js";
export type { CommandMeta } from "./Commands.js";
export type { Events } from "./Events.js";

export class BotManager {
  static start(): Promise<void>;
  static getClient(): Client;
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

export class DatabaseManager {
  private dbconfig: any;
  private db: any;

  constructor();

  private initializeMySQL(): Promise<void>;
  private ensureReady(): Promise<void>;

  public query<T = Record<string, any>>(
    sql: string,
    params?: any[],
  ): Promise<T[]>;
  public get<T = Record<string, any>>(
    sql: string,
    params?: any[],
  ): Promise<T | undefined>;
  public run(sql: string, params?: any[]): Promise<any>;
  public queue(sql: string, params?: any[]): this;
  public commit(): Promise<this>;
  public rollback(): Promise<void>;
  public savepoint(name?: string): Promise<string>;
  public releaseSavepoint(name: string): Promise<void>;
  public rollbackToSavepoint(name: string): Promise<void>;
  public tableExists(tableName: string): Promise<boolean>;
  public close(): Promise<void>;
  public getType(): "sqlite" | "mysql";
  public getConfig(): any;
}
