import { observe } from "./generators/observe.js";

// Mutable returns a generator with a value getter/setting that allows the
// generated value to be mutated. Therefore, direct mutation is only allowed
// within the defining cell, but the cell can also export functions that allows
// other cells to mutate the value as desired.
export function Mutable<T>(value: T) {
  let change: (value: T) => void;
  return Object.defineProperty(
    observe<T>((_) => {
      change = _;
      if (value !== undefined) change(value);
    }),
    "value",
    {
      get: () => value,
      set: (x) => void change((value = x)),
    },
  );
}
