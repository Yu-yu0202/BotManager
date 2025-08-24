import { Config } from "./Config";
import { Logger } from "./Logger";
import { SQLite } from "../utils/SQLite";
import { MySQL } from "../utils/MySQL";

export class Database {
  private dbconfig = Config.get()["options"]!["db"]!;
  private db!: SQLite | MySQL;

  constructor() {
    if (this.dbconfig.type === "sqlite") {
      this.db = SQLite.createConnection(this.dbconfig.file);
    } else if (this.dbconfig.type === "mysql") {
      this.initializeMySQL();
    } else {
      throw new Error("Invalid database type");
    }
    Logger.log("✅️ Database connection has been successfully established.", 'info');
  }

  private async initializeMySQL(): Promise<void> {
    try {
      this.db = await MySQL.createConnection();
    } catch (error) {
      Logger.log(`Failed to establish MySQL connection: ${error}`, "error");
      throw error;
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.dbconfig.type === "mysql" && !this.db) {
      await this.initializeMySQL();
    }
  }

  public async query<T = Record<string, any>>(
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      return (this.db as SQLite).query<T>(sql, params);
    } else {
      return await (this.db as MySQL).query<T>(sql, params);
    }
  }

  public async get<T = Record<string, any>>(
    sql: string,
    params?: any[]
  ): Promise<T | undefined> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      return (this.db as SQLite).get<T>(sql, params);
    } else {
      return await (this.db as MySQL).get<T>(sql, params);
    }
  }

  public async run(
    sql: string,
    params?: any[]
  ): Promise<any> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      return (this.db as SQLite).run(sql, params);
    } else {
      return await (this.db as MySQL).run(sql, params);
    }
  }

  public queue(sql: string, params?: any[]): this {
    if (this.dbconfig.type === "sqlite") {
      (this.db as SQLite).queue(sql, params);
    } else {
      (this.db as MySQL).queue(sql, params);
    }
    return this;
  }

  public async commit(): Promise<this> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      (this.db as SQLite).commit();
    } else {
      await (this.db as MySQL).commit();
    }
    return this;
  }

  public async rollback(): Promise<void> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      (this.db as SQLite).rollback();
    } else {
      await (this.db as MySQL).rollback();
    }
  }

  public async savepoint(name?: string): Promise<string> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      return (this.db as SQLite).savepoint(name);
    } else {
      return await (this.db as MySQL).savepoint(name);
    }
  }

  public async releaseSavepoint(name: string): Promise<void> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      (this.db as SQLite).releaseSavepoint(name);
    } else {
      await (this.db as MySQL).releaseSavepoint(name);
    }
  }

  public async rollbackToSavepoint(name: string): Promise<void> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      (this.db as SQLite).rollbackToSavepoint(name);
    } else {
      await (this.db as MySQL).rollbackToSavepoint(name);
    }
  }

  public async tableExists(tableName: string): Promise<boolean> {
    await this.ensureReady();
    
    if (this.dbconfig.type === "sqlite") {
      return (this.db as SQLite).tableExists(tableName);
    } else {
      return await (this.db as MySQL).tableExists(tableName);
    }
  }

  public async close(): Promise<void> {
    if (this.dbconfig.type === "sqlite") {
      (this.db as SQLite).close();
    } else {
      await (this.db as MySQL).close();
    }
  }

  public getType(): "sqlite" | "mysql" {
    return this.dbconfig.type;
  }

  public getConfig() {
    return this.dbconfig;
  }
}