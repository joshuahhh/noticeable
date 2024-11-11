import { useEffect, useState } from "react";

// this is basically a signal
export class ChangeableValue<T> {
  private eventTarget = new EventTarget();

  constructor(private _value: T) {
    this.eventTarget.dispatchEvent(new Event("value"));
  }

  get value() {
    return this._value;
  }

  set value(value: T) {
    this._value = value;
    this.eventTarget.dispatchEvent(new Event("value"));
  }

  subscribe(callback: () => void) {
    this.eventTarget.addEventListener("value", callback);
    return () => this.eventTarget.removeEventListener("value", callback);
  }
}

export type ChangingValue<T> = Omit<ChangeableValue<T>, "set">;

export function useChangingValue<T>(changingValue: ChangingValue<T>): T {
  const [value, setValue] = useState(changingValue.value);
  useEffect(() => {
    return changingValue.subscribe(() => setValue(changingValue.value));
  });
  return value;
}
