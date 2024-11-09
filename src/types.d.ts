declare module "@observablehq/stdlib";

declare module "@observablehq/runtime" {
  export class Runtime {
    constructor(
      builtins?: Builtins,
      global?: (name: string | symbol) => unknown,
    );

    module(define?: NotebookDefine, handler?: GetObserver): Module;
    dispose(): void;
  }

  export class Inspector implements Required<Observer> {
    constructor(element: Element);

    static into(container: Element | string): () => Inspector;

    pending(): void;
    fulfilled(value: unknown, name: string | null): void;
    rejected(error: unknown, name: string | null): void;
  }

  export class Library implements Builtins {}
  export class RuntimeError extends Error {}

  class Module {
    variable(observer?: Observer, options?: VariableOptions): Variable;

    derive(specifiers: string[], source: Module): Module;

    define(name: string | null, value: unknown): Variable;
    define(
      inputs: string[],
      definition: (...inputs: unknown[]) => unknown,
    ): Variable;
    define(
      name: string | null,
      inputs: string[],
      definition: (...inputs: unknown[]) => unknown,
    ): Variable;

    import(name: string, module: Module): Variable;
    import(name: string, alias: string, module: Module): Variable;

    redefine(name: string, value: unknown): Variable;
    redefine(
      name: string,
      inputs: string[],
      definition: (...inputs: unknown[]) => unknown,
    ): Variable;

    value(name: string): Variable;
  }

  class Variable {
    define(name: string | null, value: unknown): this;
    define(
      inputs: string[],
      definition: (...inputs: unknown[]) => unknown,
    ): this;
    define(
      name: string | null,
      inputs: string[],
      definition: (...inputs: unknown[]) => unknown,
    ): this;

    import(name: string, module: Module): this;
    import(name: string, alias: string, module: Module): this;

    delete(): void;
  }

  type Observer = Partial<{
    pending(): void;
    fulfilled(value: unknown, name: string | null): void;
    rejected(error: unknown, name: string | null): void;
  }>;

  type Builtins = Partial<Record<string, unknown>>;
  type NotebookDefine = (runtime: Runtime, observer: GetObserver) => Module;
  type GetObserver = (name: string | undefined) => Observer | void;

  type VariableOptions = Partial<{
    shadow: { [name: string]: () => unknown };
  }>;
}
