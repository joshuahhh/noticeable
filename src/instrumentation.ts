import * as A from "acorn";
import { full } from "acorn-walk";
import { generate } from "astring";

export type Range = {
  start: number;
  end: number;
};

export type Callbacks = {
  __inst_IfStatement_test(
    range: Range & {
      consequentStart: number;
      consequentEnd: number;
      alternateStart?: number;
      alternateEnd?: number;
    },
    value: any,
  ): any;
  __inst_VariableDeclarator_init(range: Range, value: any): any;
  __inst_AssignmentExpression_right(range: Range, value: any): any;
  __inst_ReturnStatement_argument(range: Range, value: any): any;
  __inst_lineNum(num: number): void;
};

export function instrumentCode(code: string): string {
  const parsed = parseExpression(code);
  walk(parsed);
  return generate(parsed);
}

export function parseExpression(expr: string): A.Expression {
  return A.parseExpressionAt(expr, 0, {
    ecmaVersion: 11,
    locations: true,
  });
}

export function parseCallExpression(
  expr: string,
  ...moreArgs: A.Expression[]
): A.CallExpression {
  const parsed = parseExpression(expr);
  if (parsed.type !== "CallExpression") {
    throw new Error("internal error!");
  }
  return { ...parsed, arguments: [...parsed.arguments, ...moreArgs] };
}

function nodeInfo(node: A.AnyNode) {
  return { start: node.start, end: node.end };
}

export function walk(node: A.AnyNode): void {
  full(node, (someNode) => {
    const node = someNode as A.AnyNode; // acorn-walk provides bad types
    if (node.type === "IfStatement" || node.type === "ConditionalExpression") {
      const test = node.test;
      const consequent = node.consequent;
      const alternate = node.alternate || undefined;
      const info = JSON.stringify({
        ...nodeInfo(test),
        consequentStart: consequent.start,
        consequentEnd: consequent.end,
        alternateStart: alternate?.start,
        alternateEnd: alternate?.end,
      });
      node.test = parseCallExpression(`__inst_IfStatement_test(${info})`, test);
    } else if (node.type === "VariableDeclarator") {
      const init = node.init;
      if (init) {
        const info = JSON.stringify(nodeInfo(init));
        node.init = parseCallExpression(
          `__inst_VariableDeclarator_init(${info})`,
          init,
        );
      }
    } else if (node.type === "AssignmentExpression") {
      const right = node.right;
      const info = JSON.stringify(nodeInfo(right));
      node.right = parseCallExpression(
        `__inst_AssignmentExpression_right(${info})`,
        right,
      );
    } else if (node.type === "ReturnStatement") {
      const argument = node.argument;
      if (argument) {
        const info = JSON.stringify(nodeInfo(argument));
        node.argument = parseCallExpression(
          `__inst_ReturnStatement_argument(${info})`,
          argument,
        );
      }
    }

    // Interspersing _ENV.lineNum() calls
    if (
      node.type === "Program" ||
      node.type === "BlockStatement" ||
      node.type === "StaticBlock"
    ) {
      node.body = enhanceWithLineNumbers(node.body);
    } else if (node.type === "SwitchCase") {
      node.consequent = enhanceWithLineNumbers(node.consequent);
    }
  });
}

function enhanceWithLineNumbers<T extends A.AnyNode>(
  body: T[],
): (T | A.ExpressionStatement)[] {
  // TODO: node.body of `while(true);` is type EmptyStatement... look into
  // converting to BlockStatement and preventing runaway loops
  const enhancedBody: (T | A.ExpressionStatement)[] = [];
  for (const childNode of body) {
    if (childNode) {
      if (childNode.loc) {
        // Using end line, b/c we want console and errors to show after the
        // source code location
        enhancedBody.push(
          makeLineNumExpressionStatement(childNode.loc.end.line),
        );
      }
      enhancedBody.push(childNode);
    }
  }
  return enhancedBody;
}

function makeLineNumExpressionStatement(num: number): A.ExpressionStatement {
  const jsCode = `__inst_lineNum(${num});`;
  const expression = parseExpression(jsCode);
  return {
    type: "ExpressionStatement",
    expression,
  } as A.ExpressionStatement;
}
