import { expect, test } from "vitest";
import { instrumentCode } from "./instrumentation";

test("", () => {
  expect(instrumentCode("() => {const x = 10; log(3);}"))
    .toMatchInlineSnapshot(`
    "() => {
      __inst_lineNum(1);
      const x = __inst_VariableDeclarator_init({
        "start": 17,
        "end": 19
      }, 10);
      __inst_lineNum(1);
      log(3);
    }"
  `);
});
