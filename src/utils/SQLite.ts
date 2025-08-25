import * as sqlite from "node:sqlite";
import { Logger } from "../core/index.js";

export class SQLite {
  private dbFile: string;
  private db: sqlite.DatabaseSync;
  private uncommitted: { sql: string; params?: sqlite.SQLInputValue[] }[] = [];
  private preparedStatements: Map<string, sqlite.StatementSync> = new Map();
  private savepointCounter = 0;

  private constructor(dbFile: string) {
    this.dbFile = dbFile;
    this.db = new sqlite.DatabaseSync(dbFile);
  }

  public static createConnection(file?: string): SQLite {
    return new SQLite(file ?? ":memory:");
  }

  public queue(sql: string, params?: sqlite.SQLInputValue[]): this {
    this.uncommitted.push({ sql, params });
    return this;
  }

  public commit(): this {
    this.db.exec("BEGIN TRANSACTION");
    try {
      for (const { sql, params } of this.uncommitted) {
        const stmt = this.getPreparedStatement(sql);
        if (params) {
          stmt.run(...params);
        } else {
          stmt.run();
        }
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      const error = e instanceof Error ? e : new Error(String(e));
      Logger.log(`Database commit failed: ${error.message}`, "error");
      throw error;
    } finally {
      this.uncommitted = [];
    }
    return this;
  }

  private getPreparedStatement(sql: string): sqlite.StatementSync {
    if (!this.preparedStatements.has(sql)) {
      const stmt = this.db.prepare(sql);
      this.preparedStatements.set(sql, stmt);
    }
    return this.preparedStatements.get(sql)!;
  }

  public savepoint(name?: string): string {
    const savepointName = name || `sp_${++this.savepointCounter}`;
    this.db.exec(`SAVEPOINT ${savepointName}`);
    return savepointName;
  }

  public releaseSavepoint(name: string): void {
    this.db.exec(`RELEASE SAVEPOINT ${name}`);
  }

  public rollbackToSavepoint(name: string): void {
    this.db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  public query<T = Record<string, sqlite.SQLOutputValue>>(
    sql: string,
    params?: sqlite.SQLInputValue[],
  ): T[] {
    const stmt = this.getPreparedStatement(sql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
  }

  public get<T = Record<string, sqlite.SQLOutputValue>>(
    sql: string,
    params?: sqlite.SQLInputValue[],
  ): T | undefined {
    const stmt = this.getPreparedStatement(sql);
    return (params ? stmt.get(...params) : stmt.get()) as T | undefined;
  }

  public run(
    sql: string,
    params?: sqlite.SQLInputValue[],
  ): sqlite.StatementResultingChanges {
    const stmt = this.getPreparedStatement(sql);
    return params ? stmt.run(...params) : stmt.run();
  }

  public tableExists(tableName: string): boolean {
    try {
      const result = this.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
        [tableName],
      );
      return result?.count === 1;
    } catch {
      return false;
    }
  }

  public rollback(): void {
    this.db.exec("ROLLBACK");
    this.uncommitted = [];
  }

  public close(): void {
    this.preparedStatements.clear();
    this.db.close();
  }
}
