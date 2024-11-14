import sha256 from "crypto-js/sha256";

export function compileExpression(exprCode: string): unknown {
  // eslint-disable-next-line no-new-func
  return new Function(`return (${exprCode});`)();
}

export function uniqueCodeId(
  content: string,
  existingIds: { [id: string]: boolean },
): string {
  const hash = sha256(content).toString().slice(0, 8);
  let id = hash;
  let count = 1;
  while (existingIds[id]) {
    id = `${hash}-${count}`;
    count++;
  }

  return id;
}

export function assignIds(codes: string[]): { id: string; code: string }[] {
  let existingIds: { [id: string]: boolean } = {};
  return codes.map((code) => {
    const id = uniqueCodeId(code, existingIds);
    existingIds[id] = true;
    return { id, code };
  });
}

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

// Object.entries with better types
export function objectEntries<T extends object>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>;
}

export type FromEntries<T> =
  T extends ReadonlyArray<
    readonly [infer K extends string | number | symbol, infer _V]
  >
    ? { [key in K]: Extract<T[number], readonly [key, any]>[1] }
    : never;

// Object.fromEntries with better types
export function objectFromEntries<
  T extends ReadonlyArray<readonly [PropertyKey, any]>,
>(entries: T): FromEntries<T> {
  return Object.fromEntries(entries) as FromEntries<T>;
}
