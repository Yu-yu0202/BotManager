import * as mysql from "mysql2/promise";
import { Logger } from "../core";
import { Config } from "../core";

export class MySQL {
  private connection: mysql.Connection | null = null;
  private pool: mysql.Pool | null = null;
  private uncommitted: { sql: string; params?: any[] }[] = [];
  private preparedStatements: Map<string, mysql.PreparedStatementInfo> =
    new Map();
  private savepointCounter = 0;
  private isTransactionActive = false;

  private constructor() {}

  public static async createConnection(
    config?: mysql.ConnectionOptions,
  ): Promise<MySQL> {
    const instance = new MySQL();

    if (config) {
      instance.connection = await mysql.createConnection(config);
    } else {
      // Config.get()からMySQL設定を取得
      const configData = Config.get();
      if (configData.options?.db?.type !== "mysql") {
        throw new Error(
          "MySQL is not configured in config. Set options.db.type to 'mysql'",
        );
      }

      const dbConfig = configData.options.db;
      if (!dbConfig.host || !dbConfig.user || !dbConfig.password) {
        throw new Error(
          "MySQL configuration is incomplete. Missing host, user, or password",
        );
      }

      const connectionConfig: mysql.ConnectionOptions = {
        host: dbConfig.host,
        port: dbConfig.port || 3306,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
      };

      instance.connection = await mysql.createConnection(connectionConfig);
    }

    return instance;
  }

  public static async createPool(config?: mysql.PoolOptions): Promise<MySQL> {
    const instance = new MySQL();

    if (config) {
      instance.pool = mysql.createPool(config);
    } else {
      // Config.get()からMySQL設定を取得
      const configData = Config.get();
      if (configData.options?.db?.type !== "mysql") {
        throw new Error(
          "MySQL is not configured in config. Set options.db.type to 'mysql'",
        );
      }

      const dbConfig = configData.options.db;
      if (!dbConfig.host || !dbConfig.user || !dbConfig.password) {
        throw new Error(
          "MySQL configuration is incomplete. Missing host, user, or password",
        );
      }

      const poolConfig: mysql.PoolOptions = {
        host: dbConfig.host,
        port: dbConfig.port || 3306,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      };

      instance.pool = mysql.createPool(poolConfig);
    }

    return instance;
  }

  private async getConnection(): Promise<mysql.Connection> {
    if (this.connection) {
      return this.connection;
    }
    if (this.pool) {
      return await this.pool.getConnection();
    }
    throw new Error("No connection or pool available");
  }

  public queue(sql: string, params?: any[]): this {
    this.uncommitted.push({ sql, params });
    return this;
  }

  public async commit(): Promise<this> {
    if (this.uncommitted.length === 0) {
      return this;
    }

    const connection = await this.getConnection();

    try {
      if (!this.isTransactionActive) {
        await connection.beginTransaction();
        this.isTransactionActive = true;
      }

      for (const { sql, params } of this.uncommitted) {
        if (params) {
          await connection.execute(sql, params);
        } else {
          await connection.execute(sql);
        }
      }

      await connection.commit();
      this.isTransactionActive = false;
    } catch (e) {
      if (this.isTransactionActive) {
        await connection.rollback();
        this.isTransactionActive = false;
      }
      const error = e instanceof Error ? e : new Error(String(e));
      Logger.log(`Database commit failed: ${error.message}`, "error");
      throw error;
    } finally {
      this.uncommitted = [];
    }
    return this;
  }

  private async getPreparedStatement(
    sql: string,
  ): Promise<mysql.PreparedStatementInfo> {
    if (!this.preparedStatements.has(sql)) {
      const connection = await this.getConnection();
      const stmt = await connection.prepare(sql);
      this.preparedStatements.set(sql, stmt);
    }
    return this.preparedStatements.get(sql)!;
  }

  public async savepoint(name?: string): Promise<string> {
    const savepointName = name || `sp_${++this.savepointCounter}`;
    const connection = await this.getConnection();
    await connection.execute(`SAVEPOINT ${savepointName}`);
    return savepointName;
  }

  public async releaseSavepoint(name: string): Promise<void> {
    const connection = await this.getConnection();
    await connection.execute(`RELEASE SAVEPOINT ${name}`);
  }

  public async rollbackToSavepoint(name: string): Promise<void> {
    const connection = await this.getConnection();
    await connection.execute(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  public async query<T = Record<string, any>>(
    sql: string,
    params?: any[],
  ): Promise<T[]> {
    const connection = await this.getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows as T[];
  }

  public async get<T = Record<string, any>>(
    sql: string,
    params?: any[],
  ): Promise<T | undefined> {
    const results = await this.query<T>(sql, params);
    return results[0];
  }

  public async run(
    sql: string,
    params?: any[],
  ): Promise<mysql.ResultSetHeader> {
    const connection = await this.getConnection();
    const [result] = await connection.execute(sql, params);
    return result as mysql.ResultSetHeader;
  }

  public async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
        [tableName],
      );
      return result?.count === 1;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    this.preparedStatements.clear();

    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  public async rollback(): Promise<void> {
    if (this.isTransactionActive) {
      const connection = await this.getConnection();
      await connection.rollback();
      this.isTransactionActive = false;
    }
    this.uncommitted = [];
  }
}
