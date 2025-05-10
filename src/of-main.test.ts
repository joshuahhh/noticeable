import dedent from "dedent";
import { expect, test } from "vitest";
import { NoticeableNotebook } from "./of-main";

test("empty notebook", async () => {
  const notebook = new NoticeableNotebook();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(notebook.notebookStateChangingValue.value).toMatchInlineSnapshot(`
    {
      "cellStates": {},
      "cells": [],
    }
  `);
});

test("notebook with 1 + 1", async () => {
  const notebook = new NoticeableNotebook();

  // this "await" only waits for code transformation, not execution
  await notebook.setNotebookCode("1 + 1");
  expect(notebook.notebookStateChangingValue.value).toMatchInlineSnapshot(`
    {
      "cellStates": {
        "72fce594": {
          "displays": [],
          "outputs": {},
          "transpiled": "async (display) => {
    display(await(
    1 + 1
    ))
    }
    ",
          "type": "code",
          "variableState": {
            "type": "pending",
          },
        },
      },
      "cells": [
        {
          "code": "1 + 1",
          "id": "72fce594",
        },
      ],
    }
  `);

  // this "await" should be enough for execution
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(notebook.notebookStateChangingValue.value).toMatchInlineSnapshot(`
    {
      "cellStates": {
        "72fce594": {
          "displays": [
            2,
          ],
          "outputs": {},
          "transpiled": "async (display) => {
    display(await(
    1 + 1
    ))
    }
    ",
          "type": "code",
          "variableState": {
            "type": "fulfilled",
            "value": undefined,
          },
        },
      },
      "cells": [
        {
          "code": "1 + 1",
          "id": "72fce594",
        },
      ],
    }
  `);
});

test("notebook with a variable and reference", async () => {
  const notebook = new NoticeableNotebook();

  // this "await" only waits for code transformation, not execution
  await notebook.setNotebookCode(dedent`
    a + 10

    const a = 1 + 1
  `);
  expect(notebook.notebookStateChangingValue.value).toMatchInlineSnapshot(`
    {
      "cellStates": {
        "55f62ddf": {
          "displays": [],
          "outputs": {},
          "transpiled": "(report_outputs) => {
    const a = 1 + 1
    report_outputs({a});
    return {a};
    }
    ",
          "type": "code",
          "variableState": {
            "type": "pending",
          },
        },
        "8ce38fe5": {
          "displays": [],
          "outputs": {},
          "transpiled": "async (a,display) => {
    display(await(
    a + 10
    ))
    }
    ",
          "type": "code",
          "variableState": {
            "type": "pending",
          },
        },
      },
      "cells": [
        {
          "code": "a + 10",
          "id": "8ce38fe5",
        },
        {
          "code": "const a = 1 + 1",
          "id": "55f62ddf",
        },
      ],
    }
  `);

  // this "await" should be enough for execution
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(notebook.notebookStateChangingValue.value).toMatchInlineSnapshot(`
    {
      "cellStates": {
        "55f62ddf": {
          "displays": [],
          "outputs": {
            "a": 2,
          },
          "transpiled": "(report_outputs) => {
    const a = 1 + 1
    report_outputs({a});
    return {a};
    }
    ",
          "type": "code",
          "variableState": {
            "type": "fulfilled",
            "value": {
              "a": 2,
            },
          },
        },
        "8ce38fe5": {
          "displays": [
            12,
          ],
          "outputs": {},
          "transpiled": "async (a,display) => {
    display(await(
    a + 10
    ))
    }
    ",
          "type": "code",
          "variableState": {
            "type": "fulfilled",
            "value": undefined,
          },
        },
      },
      "cells": [
        {
          "code": "a + 10",
          "id": "8ce38fe5",
        },
        {
          "code": "const a = 1 + 1",
          "id": "55f62ddf",
        },
      ],
    }
  `);
});

test("notebook with a promised variable and reference", async () => {
  const notebook = new NoticeableNotebook();

  // this "await" only waits for code transformation, not execution
  await notebook.setNotebookCode(dedent`
    a + 10

    const a = new Promise((resolve) => setTimeout(() => resolve(2), 0))
  `);
  expect(notebook.notebookStateChangingValue.value).toMatchInlineSnapshot(`
    {
      "cellStates": {
        "8ce38fe5": {
          "displays": [],
          "outputs": {},
          "transpiled": "async (a,display) => {
    display(await(
    a + 10
    ))
    }
    ",
          "type": "code",
          "variableState": {
            "type": "pending",
          },
        },
        "ebb1545e": {
          "displays": [],
          "outputs": {},
          "transpiled": "(report_outputs) => {
    const a = new Promise((resolve) => setTimeout(() => resolve(2), 0))
    report_outputs({a});
    return {a};
    }
    ",
          "type": "code",
          "variableState": {
            "type": "pending",
          },
        },
      },
      "cells": [
        {
          "code": "a + 10",
          "id": "8ce38fe5",
        },
        {
          "code": "const a = new Promise((resolve) => setTimeout(() => resolve(2), 0))",
          "id": "ebb1545e",
        },
      ],
    }
  `);

  // this "await" should be enough for execution
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(notebook.notebookStateChangingValue.value).toMatchInlineSnapshot(`
    {
      "cellStates": {
        "8ce38fe5": {
          "displays": [
            12,
          ],
          "outputs": {},
          "transpiled": "async (a,display) => {
    display(await(
    a + 10
    ))
    }
    ",
          "type": "code",
          "variableState": {
            "type": "fulfilled",
            "value": undefined,
          },
        },
        "ebb1545e": {
          "displays": [],
          "outputs": {
            "a": Promise {},
          },
          "transpiled": "(report_outputs) => {
    const a = new Promise((resolve) => setTimeout(() => resolve(2), 0))
    report_outputs({a});
    return {a};
    }
    ",
          "type": "code",
          "variableState": {
            "type": "fulfilled",
            "value": {
              "a": Promise {},
            },
          },
        },
      },
      "cells": [
        {
          "code": "a + 10",
          "id": "8ce38fe5",
        },
        {
          "code": "const a = new Promise((resolve) => setTimeout(() => resolve(2), 0))",
          "id": "ebb1545e",
        },
      ],
    }
  `);
});
