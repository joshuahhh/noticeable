import { UpdateProxy, updateProxy } from "@engraft/update-proxy";
import { Module, Runtime, Variable } from "@observablehq/runtime";
import { Library } from "@observablehq/stdlib";
import * as React from "react";
import { ChangeableValue, ChangingValue } from "./ChangingValue";
import { codeCells } from "./code-cells";
import { dark } from "./of/client/stdlib/generators";
import { transformJavaScript } from "./of/javascript/module2";
import { JavaScriptNode, parseJavaScript } from "./of/javascript/parse";
import { Sourcemap } from "./of/sourcemap";
import { assignIds, compileExpression } from "./shared";

// @ts-ignore
import { Mutable } from "./of/client/stdlib/mutable";

const library = {
  ...new Library(),
  React,
  // version in Library is out of date
  Mutable: () => Mutable,
  dark,
};

const Generators = library.Generators;

type FrameworkishNotebookCell = {
  id: string;
  mode?: "inline" | "block" | "jsx";
  inputs?: string[];
  outputs?: string[];
  body: (...inputs: unknown[]) => unknown;
};

export type ObservableState =
  | { type: "pending" }
  | { type: "fulfilled"; value: unknown }
  | { type: "rejected"; error: unknown };

export type CellState =
  | {
      type: "code";
      variableState: ObservableState;
      displays: unknown[];
      outputs: { [name: string]: unknown };
      transpiled?: string;
    }
  | {
      type: "markdown";
      markdown: string;
    };

// this is the information returned by the FrameworkishNotebook to
// its client via the setNotebookState callback
export type NotebookState = {
  cells: Cell[];
  cellStates: { [id: string]: CellState };
};
export type Cell = {
  id: string;
  code: string;
};

export class FrameworkishNotebook {
  // internal stuff
  main: Module;
  variablesById = new Map<string, Variable[]>(); // for cleanup
  oldCodes = new Map<string, string>();

  constructor(builtins: any = {}, global?: (name: string) => unknown) {
    const runtime = new Runtime(
      {
        ...library,
        ...builtins,
      },
      global as any,
    );
    this.main = runtime.module();
  }

  // external stuff
  private notebookState: ChangeableValue<NotebookState> = new ChangeableValue({
    cells: [],
    cellStates: {},
  });
  get notebookStateChangingValue(): ChangingValue<NotebookState> {
    return this.notebookState;
  }
  notebookStateUP: UpdateProxy<NotebookState> = updateProxy(
    (f) => (this.notebookState.value = f(this.notebookState.value)),
  );

  async setNotebookCode(code: string) {
    // remove lines beginning with `///` (triple-slash comments)
    code = code.replace(/^\/\/\/.*$/gm, "");
    const codes = codeCells(code).map((cell) => cell.code);
    const codesWithIds = assignIds(codes);

    const newCodes = new Map(codesWithIds.map((c) => [c.id, c.code]));
    const { removedIds, addedIds } = diffCodes(this.oldCodes, newCodes);
    this.oldCodes = newCodes;

    // TODO: we do all the async stuff ahead of time so that there's
    // no async gap with undefining and defining vars; this seems
    // inelegant to me
    const transformedPromisesById = Object.fromEntries(
      addedIds.map((id) => {
        const cell = codesWithIds.find((c) => c.id === id)!;
        return [id, transformJavaScript(cell.code, "tsx", "SOMEPATH")];
      }),
    );
    const transformedResultsById = await allSettledObject(
      transformedPromisesById,
    );

    // and we do this after the async stuff
    this.notebookStateUP.cells.$set(codesWithIds);

    for (const id of removedIds) {
      this.undefine(id);
    }

    for (const id of addedIds) {
      try {
        const cell = codesWithIds.find((c) => c.id === id)!;
        const lines = cell.code.split("\n");
        if (lines.every((line) => line.startsWith("//"))) {
          // TODO: crude comment detection & stripping
          const markdown = lines.map((line) => line.slice(2).trim()).join("\n");
          this.notebookStateUP.cellStates[id].$set({
            type: "markdown",
            markdown,
          });
        } else {
          const cellStateUP = this.notebookStateUP.cellStates[id].$as<
            CellState & { type: "code" }
          >();
          cellStateUP.$set({
            type: "code",
            variableState: { type: "pending" },
            displays: [],
            outputs: {},
          });
          const transformed = getResultValue(transformedResultsById[id]);
          // to accommodate trailing semicolons added by prettier...
          const trimmed = transformed.trimEnd().replace(/;$/, "");
          const parsed = parseJavaScript(trimmed, { path: "SOMEPATH" });
          const transpiled = transpileToDef(parsed);
          cellStateUP.transpiled.$set(transpiled.code);
          const compiled = compileExpression(transpiled.code) as any;
          this.define({
            id,
            body: compiled,
            inputs: transpiled.inputs,
            outputs: transpiled.outputs,
          });
        }
      } catch (e) {
        this.setVariableState(id, { type: "rejected", error: e });
      }
    }
  }

  setVariableState(id: string, state: ObservableState) {
    if (!this.notebookState.value.cellStates[id]) {
      // TODO: why is this happening; can we have this not happen?
      console.log("cell was removed before it was fulfilled");
      return;
    }
    this.notebookStateUP.cellStates[id].variableState.$set(state);
  }

  define(cell: FrameworkishNotebookCell) {
    const { id, inputs = [], outputs = [], body } = cell;
    const variables: Variable[] = [];
    this.variablesById.set(id, variables);
    // const loading = findLoading(root);
    // root._nodes = [];
    // if (mode === undefined) root._expanded = []; // only blocks have inspectors
    // if (loading) root._nodes.push(loading);
    // const pending = () => reset(root, loading);
    // const rejected = (error) => reject(root, error);
    // this is the main variable, containing the body of the cell
    // TODO: used to have _node for visibility promise
    const v = this.main.variable(
      {
        fulfilled: (value) =>
          this.setVariableState(id, { type: "fulfilled", value }),
        rejected: (error) =>
          this.setVariableState(id, { type: "rejected", error }),
        pending: () => this.setVariableState(id, { type: "pending" }),
      },
      { shadow: {} },
    );
    // TODO: { pending, rejected }
    if (inputs.includes("display") || inputs.includes("view")) {
      let displayVersion = -1; // the variable._version of currently-displayed values

      const Variable = getVariableConstructor(v);
      const vd = new Variable(2, v._module);
      vd.define([], () => (value: unknown) => {
        // TODO: I simplified this from the OF code, set inputs
        // to [] and get version in the call to display; is that
        // ok?
        let version = v._version; // capture version on input change
        if (version < displayVersion) {
          throw new Error("stale display");
        } else if (version > displayVersion) {
          this.notebookStateUP.cellStates[id]
            .$as<CellState & { type: "code" }>()
            .displays.$set([]);
        }
        displayVersion = version;
        this.notebookStateUP.cellStates[id]
          .$as<CellState & { type: "code" }>()
          .displays.$((old) => [...old, value]);
        return value;
      });
      (v as any)._shadow.set("display", vd);
      if (inputs.includes("view")) {
        const Variable = getVariableConstructor(v);
        const vv = new Variable(2, v._module, null, { shadow: {} });
        vv._shadow.set("display", vd);
        vv.define(
          ["display"],
          (display: (v: unknown) => void) => (v: unknown) =>
            Generators.input(display(v)),
        );
        (v as any)._shadow.set("view", vv);
      }
    }
    if (inputs.includes("report_outputs")) {
      // TODO: I'm too lazy to rewrite source code right now so we're
      // not logging outputs immediately after their definitions,
      // just at the end of the cell. Not ideal for async cells.

      let displayVersion = -1; // the variable._version of currently-displayed values

      const Variable = getVariableConstructor(v);
      const vd = new Variable(2, v._module);
      vd.define([], () => (value: unknown) => {
        // TODO: I simplified this from the OF code, set inputs
        // to [] and get version in the call to display; is that
        // ok?
        let version = v._version; // capture version on input change
        if (version < displayVersion) {
          throw new Error("stale display");
        } else if (version > displayVersion) {
          this.notebookStateUP.cellStates[id].outputs
            .$as<CellState & { type: "code" }>()
            .outputs.$set({});
        }
        displayVersion = version;
        this.notebookStateUP.cellStates[id]
          .$as<CellState & { type: "code" }>()
          .outputs.$set(value as { [name: string]: unknown });
        return value;
      });
      (v as any)._shadow.set("report_outputs", vd);
    }
    // if (inputs.includes("display") || inputs.includes("view")) {
    //   let displayVersion = -1; // the variable._version of currently-displayed values
    //   const predisplay = mode === "jsx" ? noop : clear; // jsx replaces previous display naturally
    //   const display =
    //     mode === "inline"
    //       ? displayInline
    //       : mode === "jsx"
    //         ? displayJsx
    //         : displayBlock;
    //   const vd = new v.constructor(2, v._module);
    //   vd.define(
    //     inputs.filter((i) => i !== "display" && i !== "view"),
    //     () => {
    //       let version = v._version; // capture version on input change
    //       return (value) => {
    //         if (version < displayVersion) throw new Error("stale display");
    //         else if (version > displayVersion) predisplay(root);
    //         displayVersion = version;
    //         display(root, value);
    //         return value;
    //       };
    //     },
    //   );
    //   v._shadow.set("display", vd);
    //   if (inputs.includes("view")) {
    //     const vv = new v.constructor(2, v._module, null, { shadow: {} });
    //     vv._shadow.set("display", vd);
    //     vv.define(
    //       ["display"],
    //       (display) => (v) => Generators.input(display(v)),
    //     );
    //     v._shadow.set("view", vv);
    //   }
    // }
    v.define(outputs.length ? `cell ${id}` : null, inputs, body);
    variables.push(v);
    for (const o of outputs) {
      variables.push(
        this.main
          .variable(true as any) // idk how they get away with `true` here
          .define(o, [`cell ${id}`], (exports: any) => exports[o]),
      );
    }
  }

  undefine(id: string) {
    this.variablesById.get(id)?.forEach((v) => v.delete());
    this.variablesById.delete(id);
    this.notebookStateUP.cellStates[id].$remove();
  }
}

function diffCodes(
  oldCodes: Map<string, string>,
  newCodes: Map<string, string>,
) {
  const removedIds = [];
  const addedIds = [];
  for (const [id, body] of oldCodes) {
    if (newCodes.get(id) !== body) {
      removedIds.push(id);
    }
  }
  for (const [id, body] of newCodes) {
    if (oldCodes.get(id) !== body) {
      addedIds.push(id);
    }
  }
  return { removedIds, addedIds };
}

export function transpileToDef(node: JavaScriptNode) {
  let async = node.async;
  const inputs = Array.from(
    new Set<string>(node.references.map((r) => r.name)),
  );
  const outputs = Array.from(
    new Set<string>(node.declarations?.map((r) => r.name)),
  );
  // "display" here really means "implicit display of an expression"
  const display =
    node.expression && !inputs.includes("display") && !inputs.includes("view");
  if (display) {
    inputs.push("display");
    async = true;
  }
  if (outputs.length) {
    inputs.push("report_outputs");
  }
  const output = new Sourcemap(node.input).trim();
  if (display) {
    output
      .insertLeft(0, "display(await(\n")
      .insertRight(node.input.length, "\n))");
  }
  output.insertLeft(0, `${async ? "async " : ""}(${inputs}) => {\n`);
  if (outputs.length) {
    output.insertRight(node.input.length, `\nreport_outputs({${outputs}});`);
    output.insertRight(node.input.length, `\nreturn {${outputs}};`);
  }
  output.insertRight(node.input.length, "\n}\n");
  return {
    code: String(output),
    inputs,
    outputs,
  };
}

function getVariableConstructor(v: Variable) {
  return v.constructor as typeof Variable;
}

function getResultValue<T>(result: PromiseSettledResult<T>) {
  if (result.status === "rejected") {
    throw result.reason;
  }
  return result.value;
}

function allSettledObject<T>(promises: { [id: string]: Promise<T> }) {
  return Promise.allSettled(Object.values(promises)).then((results) =>
    Object.fromEntries(
      Object.keys(promises).map((key, i) => [key, results[i]]),
    ),
  );
}
