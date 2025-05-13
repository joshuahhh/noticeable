import type { Expression, Identifier, Options, Program } from "acorn";
import { Parser, tokTypes } from "acorn";
import { checkAssignments } from "./assignments.js";
import { findAwaits } from "./awaits.js";
import { findDeclarations } from "./declarations.js";
import { findExports } from "./imports.js";
import { findReferences } from "./references.js";
import { syntaxError } from "./syntaxError.js";

export const acornOptions: Options = {
  ecmaVersion: 13,
  sourceType: "module",
};

export interface ParsedJavaScript {
  body: Program | Expression;
  declarations: Identifier[] | null; // null for expressions that can’t declare top-level variables, a.k.a outputs
  references: Identifier[]; // the unbound references, a.k.a. inputs
  expression: boolean; // is this an expression or a program cell?
  async: boolean; // does this use top-level await?
  originalCode: string;
}

/**
 * Parses the specified JavaScript code block, or if the inline option is true,
 * the specified inline JavaScript expression.
 */
export function parseJavaScript(input: string): ParsedJavaScript {
  let expression = maybeParseExpression(input); // first attempt to parse as expression
  if (expression?.type === "ClassExpression" && expression.id) {
    expression = null;
  } // treat named class as program
  if (expression?.type === "FunctionExpression" && expression.id) {
    expression = null;
  } // treat named function as program
  const body = expression ?? parseProgram(input); // otherwise parse as a program
  const exports = findExports(body);
  if (exports.length) {
    throw syntaxError("Unexpected token 'export'", exports[0], input);
  } // disallow exports
  const references = findReferences(body);
  checkAssignments(body, references, input);
  return {
    body,
    declarations: expression ? null : findDeclarations(body as Program, input),
    references,
    expression: !!expression,
    async: findAwaits(body).length > 0,
    originalCode: input,
  };
}

export function parseProgram(input: string): Program {
  const body = Parser.parse(input, acornOptions);
  return body;
}

/**
 * Parses a single expression; like parseExpressionAt, but returns null if
 * additional input follows the expression.
 */
export function maybeParseExpression(input: string): Expression | null {
  const parser = new (Parser as any)(acornOptions, input, 0); // private constructor
  parser.nextToken();
  try {
    const node = parser.parseExpression();
    return parser.type === tokTypes.eof ? node : null;
  } catch {
    return null;
  }
}
