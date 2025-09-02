export async function* queue<T>(
  initialize: (change: (value: T) => void) => (() => void) | undefined,
) {
  let resolve: ((value: T) => void) | null;
  const values: T[] = [];

  const dispose = initialize((x) => {
    values.push(x);
    if (resolve) resolve(values.shift()!), (resolve = null);
    return x;
  });

  if (dispose !== undefined && typeof dispose !== "function") {
    throw new Error(
      typeof (dispose as any).then === "function"
        ? "async initializers are not supported"
        : "initializer returned something, but not a dispose function",
    );
  }

  try {
    while (true) {
      yield values.length ? values.shift() : new Promise((_) => (resolve = _));
    }
  } finally {
    if (dispose !== undefined) {
      dispose();
    }
  }
}
