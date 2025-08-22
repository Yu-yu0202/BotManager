import { Config } from "./Config";
import { Logger } from "./Logger";

export class Database {
    private static dbconfig = Config.get()["options"]!["db"]!;
    

	public static connect(): void {
		try {
			Logger.log("✅️ Database connected successfully", "info");
		} catch (error: any) {
			Logger.log(`Failed to Connect Database: ${(error as Error).message}`, 'error');
		}
	}

	public static disconnect(): void {
		try {
			Logger.log("✅️ Database disconnected successfully", "info");
		} catch (error: any) {
			Logger.log(`Failed to Disconnect Database: ${(error as Error).message}`, 'error');
		}
	}

	public static async Session<T>(callback: (session: any) => Promise<T>): Promise<T> {
		let session: any;
		try {
			switch (this.dbconfig!.type) {
				case "sqlite":
					session = {};
					break;
				case "mysql":
					session = {};
					break;
				case "postgresql":
					session = {};
					break;
			}
			const result = await callback(session);
			return result;
		} catch (error) {
			Logger.log(`Session error: ${(error as Error).message}`, "error");
			throw error;
		} finally {
		}
	}
}