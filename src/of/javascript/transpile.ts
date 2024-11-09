import { Sourcemap } from "../sourcemap.js";
import { hasImportDeclaration } from "./imports.js";
import type { FileInfo } from "./module.js";
import type { JavaScriptNode } from "./parse.js";

export interface TranspileOptions {
  id: string;
  path: string;
  mode?: string;
}

export function transpileJavaScript(
  node: JavaScriptNode,
  { id, mode }: TranspileOptions,
): string {
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
  if (hasImportDeclaration(node.body)) {
    async = true;
  }
  const output = new Sourcemap(node.input).trim();
  if (display) {
    output
      .insertLeft(0, "display(await(\n")
      .insertRight(node.input.length, "\n))");
  }
  output.insertLeft(0, `, body: ${async ? "async " : ""}(${inputs}) => {\n`);
  if (outputs.length) {
    output.insertLeft(0, `, outputs: ${JSON.stringify(outputs)}`);
  }
  if (inputs.length) {
    output.insertLeft(0, `, inputs: ${JSON.stringify(inputs)}`);
  }
  if (mode && mode !== "block") {
    output.insertLeft(0, `, mode: ${JSON.stringify(mode)}`);
  }
  output.insertLeft(0, `define({id: ${JSON.stringify(id)}`);
  if (outputs.length) {
    output.insertRight(node.input.length, `\nreturn {${outputs}};`);
  }
  output.insertRight(node.input.length, "\n}});\n");
  return String(output);
}

export interface TranspileModuleOptions {
  root: string;
  path: string;
  servePath?: string; // defaults to /_import/${path}
  resolveImport?: (specifier: string) => string | Promise<string>;
  resolveFile?: (name: string) => string;
  resolveFileInfo?: (name: string) => FileInfo | undefined;
}
