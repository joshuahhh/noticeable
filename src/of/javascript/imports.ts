import type { ExportAllDeclaration, ExportNamedDeclaration, Node } from "acorn";
import { simple } from "acorn-walk";

export type ExportNode = ExportAllDeclaration | ExportNamedDeclaration;

/**
 * Finds all export declarations in the specified node. (This is used to
 * disallow exports within JavaScript code blocks.) Note that this includes both
 * "export const foo" declarations and "export {foo} from bar" declarations.
 */
export function findExports(body: Node): ExportNode[] {
  const exports: ExportNode[] = [];

  simple(body, {
    ExportAllDeclaration: findExport,
    ExportNamedDeclaration: findExport,
  });

  function findExport(node: ExportNode) {
    exports.push(node);
  }

  return exports;
}

/** Returns true if the body includes an import declaration. */
export function hasImportDeclaration(body: Node): boolean {
  let has = false;

  simple(body, {
    ImportDeclaration() {
      has = true;
    },
  });

  return has;
}

export function isJavaScript(path: string): boolean {
  return /\.(m|c)?js(\?|$)/i.test(path);
}
