import { UpdateProxy, updateProxy } from "@engraft/update-proxy";
import { Runtime, Variable } from "@observablehq/runtime";
import { Library } from "@observablehq/stdlib";
import { codeCells } from "./code-cells";
import { JavaScriptNode, parseJavaScript } from "./of/javascript/parse";
import { Sourcemap } from "./of/sourcemap";
import { assignIds, compileExpression } from "./shared";

const library = new Library();
export const runtime = new Runtime(library);

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

export type CellState = {
  variableState: ObservableState;
  displays: unknown[];
};

export type NotebookState = {
  cells: { id: string; code: string }[];
  cellStates: { [id: string]: CellState };
};

export class FrameworkishNotebook {
  main = runtime.module();
  cellsById = new Map<
    string,
    {
      cell: FrameworkishNotebookCell;
      // we keep track of the variables so we can delete them later
      variables: Variable[];
    }
  >();
  oldCodes = new Map<string, string>();
  notebookStateUP: UpdateProxy<NotebookState>;

  constructor(
    public setNotebookState: (
      updater: (states: NotebookState) => NotebookState,
    ) => void,
  ) {
    this.notebookStateUP = updateProxy(this.setNotebookState);
  }

  setNotebookCode(code: string) {
    const codes = codeCells(code).map((cell) => cell.code);
    const codesWithIds = assignIds(codes);

    this.notebookStateUP.cells.$set(codesWithIds);

    const newCodes = new Map(codesWithIds.map((c) => [c.id, c.code]));
    // current problem... if a cell doesn't parse correctly, we don't
    // actually want to include it in newCodes, if we're following
    // the Framework's approach anyway, we want to pretend like it
    // doesn't exist. seems like a reasonable approach! but requires
    // some rejiggering here...
    const { removedIds, addedIds } = diffCodes(this.oldCodes, newCodes);
    this.oldCodes = newCodes;

    for (const id of removedIds) {
      this.undefine(id);
    }

    for (const id of addedIds) {
      this.notebookStateUP.cellStates[id].$set({
        variableState: { type: "pending" },
        displays: [],
      });
      try {
        const cell = codesWithIds.find((c) => c.id === id)!;
        const parsed = parseJavaScript(cell.code, { path: "SOMEPATH" });
        const transpiled = transpileToDef(parsed);
        const compiled = compileExpression(transpiled.code) as any;
        this.define({
          id,
          body: compiled,
          inputs: transpiled.inputs,
          outputs: transpiled.outputs,
        });
      } catch (e) {
        this.setState(id, { type: "rejected", error: e });
      }
    }
  }

  setState(id: string, state: ObservableState) {
    if (!this.cellsById.has(id)) {
      // TODO: why is this happening; can we have this not happen?
      console.log("cell was removed before it was fulfilled");
      return;
    }
    this.notebookStateUP.cellStates[id].variableState.$set(state);
  }

  define(cell: FrameworkishNotebookCell) {
    const { id, inputs = [], outputs = [], body } = cell;
    const variables: Variable[] = [];
    this.cellsById.set(id, { cell, variables });
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
        fulfilled: (value) => this.setState(id, { type: "fulfilled", value }),
        rejected: (error) => this.setState(id, { type: "rejected", error }),
        pending: () => this.setState(id, { type: "pending" }),
      },
      { shadow: {} },
    );
    // TODO: { pending, rejected }
    if (inputs.includes("display")) {
      let displayVersion = -1; // the variable._version of currently-displayed values
      const vd = new v.constructor(2, v._module);
      vd.define([], () => {
        let version = (v as any)._version; // capture version on input change
        return (value: unknown) => {
          console.log("display", id, value);
          if (version < displayVersion) {
            throw new Error("stale display");
          } else if (version > displayVersion) {
            this.notebookStateUP.cellStates[id].displays.$set([]);
          }
          displayVersion = version;
          this.notebookStateUP.cellStates[id].displays.$((old) => [
            ...old,
            value,
          ]);
          return value;
        };
      });
      (v as any)._shadow.set("display", vd);
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
    this.cellsById.get(id)?.variables.forEach((v) => v.delete());
    this.cellsById.delete(id);
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
  const output = new Sourcemap(node.input).trim();
  if (display) {
    output
      .insertLeft(0, "display(await(\n")
      .insertRight(node.input.length, "\n))");
  }
  output.insertLeft(0, `${async ? "async " : ""}(${inputs}) => {\n`);
  if (outputs.length) {
    output.insertRight(node.input.length, `\nreturn {${outputs}};`);
  }
  output.insertRight(node.input.length, "\n}\n");
  return {
    code: String(output),
    inputs,
    outputs,
  };
}
