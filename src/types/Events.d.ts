export type Events = {
  name: string;
  exec: (...args: unknown[]) => Promise<void> | void;
  once?: boolean;
};
