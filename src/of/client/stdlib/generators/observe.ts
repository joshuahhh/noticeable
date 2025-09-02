export async function* observe<T>(
  initialize: (notify: (value: T) => void) => (() => void) | void,
): AsyncGenerator<T, void, unknown> {
  let resolve: ((value: T) => void) | null;
  let value: T;
  let stale = false;

  const dispose = initialize((x) => {
    value = x;
    if (resolve) resolve(x), (resolve = null);
    else stale = true;
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
      yield stale
        ? ((stale = false), value!)
        : new Promise<T>((_) => (resolve = _));
    }
  } finally {
    if (dispose !== undefined) {
      dispose();
    }
  }
}
