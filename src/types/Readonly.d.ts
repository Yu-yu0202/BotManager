export type AllReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends Array<infer U>
    ? readonly AllReadonly<U>[]
    : T extends object
      ? { readonly [P in keyof T]: AllReadonly<T[P]> }
      : T;
