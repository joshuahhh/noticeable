import dedent from "dedent";
import { expect, test } from "vitest";
import { codeCells } from "./code-cells";

test("codeCells basically works", () => {
  expect(codeCells(dedent``)).toMatchInlineSnapshot(`[]`);

  expect(
    codeCells(dedent`
      1 {
        2

        3
      }

      4
      5
    `),
  ).toEqual([
    {
      code: dedent`
        1 {
          2

          3
        }
      `,
      firstLineNum: 0,
    },
    {
      code: dedent`
        4
        5
      `,
      firstLineNum: 6,
    },
  ]);
});
