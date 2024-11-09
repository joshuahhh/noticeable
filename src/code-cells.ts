type LineType = "empty" | "unindented" | "indented";

function getLineType(line: string): LineType {
  if (line.match(/^\s*$/)) {
    return "empty";
  } else if (line.match(/^\s/)) {
    return "indented";
  } else {
    return "unindented";
  }
}

export type CodeCell = {
  code: string;
  firstLineNum: number;
};

export function codeCells(text: string): CodeCell[] {
  let cells: CodeCell[] = [];
  type State =
    | { type: "between-cells" }
    | { type: "in-cell"; cell: CodeCell; indent: "indented" | "unindented" };
  let state: State = { type: "between-cells" };

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineType = getLineType(line);
    if (state.type === "between-cells") {
      if (lineType === "empty") {
        // ignore empty lines between cells
      } else {
        state = {
          type: "in-cell",
          cell: { code: line, firstLineNum: i },
          indent: lineType,
        };
      }
    } else {
      // in-cell
      if (
        lineType === "empty" &&
        state.type === "in-cell" &&
        state.indent === "unindented"
      ) {
        cells.push(state.cell);
        state = { type: "between-cells" };
      } else {
        if (lineType !== "empty") {
          state.indent = lineType;
        }
        state.cell.code = state.cell.code + "\n" + line;
      }
    }
  }
  if (state.type === "in-cell") {
    cells.push(state.cell);
  }

  return cells;
}
