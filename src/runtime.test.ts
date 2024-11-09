import { Runtime, RuntimeError } from "@observablehq/runtime";
import { expect, test } from "vitest";

// these are just some tests that runtime does what we expect it to do

type ResolvablePromise<T> = Promise<T> & { resolve: (value: T) => void };

function makeResolvablePromise<T>(): ResolvablePromise<T> {
  let resolve!: (value: T) => void;
  return Object.assign(
    new Promise<T>((_resolve) => {
      resolve = _resolve;
    }),
    { resolve },
  );
}

type TestObserverState =
  | { type: "pending" }
  | { type: "fulfilled"; value: unknown }
  | { type: "rejected"; error: unknown };

class TestObserver {
  state: TestObserverState;
  nextState: ResolvablePromise<TestObserverState>;

  constructor() {
    this.state = { type: "pending" };
    this.nextState = makeResolvablePromise();
  }

  pending() {
    this._setState({ type: "pending" });
  }
  fulfilled(value: unknown) {
    this._setState({ type: "fulfilled", value });
  }
  rejected(error: unknown) {
    this._setState({ type: "rejected", error });
  }

  _setState(state: TestObserverState) {
    this.nextState.resolve(state);
    this.state = state;
    this.nextState = makeResolvablePromise();
  }
}

test("test", async () => {
  const runtime = new Runtime({});
  const main = runtime.module();

  const aObserver = new TestObserver();
  const a = main.variable(aObserver);
  a.define("a", () => 10);

  expect(await aObserver.nextState).toEqual({ type: "pending" });
  expect(await aObserver.nextState).toEqual({ type: "fulfilled", value: 10 });

  const bObserver = new TestObserver();
  const b = main.variable(bObserver);
  b.define(["a"], (a: any) => a + 1);

  expect(await bObserver.nextState).toEqual({ type: "pending" });
  expect(await bObserver.nextState).toEqual({ type: "fulfilled", value: 11 });

  a.define("a", () => 20);

  expect(await bObserver.nextState).toEqual({ type: "pending" });
  expect(await bObserver.nextState).toEqual({ type: "fulfilled", value: 21 });

  a.define("a", () => {
    throw new Error("error");
  });

  expect(await bObserver.nextState).toEqual({ type: "pending" });
  expect(await bObserver.nextState).toEqual({
    type: "rejected",
    error: new Error("error"),
  });

  a.define("a", () => 30);

  expect(await bObserver.nextState).toEqual({ type: "pending" });
  expect(await bObserver.nextState).toEqual({ type: "fulfilled", value: 31 });

  a.define("notA", () => 40);

  expect(await bObserver.nextState).toEqual({ type: "pending" });
  expect(await bObserver.nextState).toEqual({
    type: "rejected",
    error: new RuntimeError("a is not defined"),
  });
});
