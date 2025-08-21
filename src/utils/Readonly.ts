import type { AllReadonly } from "../types";

export class ReadonlyUtil {
  public static toReadonly<T extends object>(obj: T): AllReadonly<T> {
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        typeof item === "object" && item !== null
          ? this.toReadonly(item)
          : item,
      ) as any;
    }

    Object.getOwnPropertyNames(obj).forEach((key) => {
      const value = (obj as any)[key];
      if (value && typeof value === "object") {
        (obj as any)[key] = this.toReadonly(value);
      }
    });
    return Object.freeze(obj) as AllReadonly<T>;
  }
}
