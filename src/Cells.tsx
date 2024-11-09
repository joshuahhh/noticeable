import { javascript } from "@codemirror/lang-javascript";
import { DOM } from "@engraft/shared/lib/DOM";
import { memo, useEffect, useRef, useState } from "react";
import { ObjectInspector } from "react-inspector";
import { FrameworkishNotebook, NotebookState } from "./of-main";
import { ControlledCodeMirror } from "./shared";

const jsExtensions = [javascript()];

export const Cells = memo(() => {
  const [code, setCode] = useState(`const a = 1;\n\nconst b = a * 2`);

  const [notebookState, setNotebookState] = useState<NotebookState>({
    cells: [],
    cellStates: {},
  });

  const nbRef = useRef(new FrameworkishNotebook(setNotebookState));

  useEffect(() => {
    nbRef.current.setNotebookCode(code);
  }, [code]);

  return (
    <div className="p-6 max-w-full">
      <div className="flex flex-row gap-24 w-full">
        <div className="w-1/3">
          <ControlledCodeMirror
            value={code}
            setValue={setCode}
            extensions={jsExtensions}
          />
        </div>
        <div className="w-1/3">
          {notebookState.cells.map(({ id, code }) => {
            return (
              <div key={id} className="mb-10">
                {/* <h4>{id}</h4> */}
                <pre>{code}</pre>
                <ObjectInspector
                  data={notebookState.cellStates[id]}
                  expandLevel={10}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function Display({ value }: { value: unknown }) {
  if (isNode(value)) {
    return <DOM element={value as any} />;
  } else {
    return <ObjectInspector data={value} expandLevel={10} />;
  }
}

// Note: Element.prototype is instanceof Node, but cannot be inserted!
function isNode(value: unknown): value is Node {
  return value instanceof Node && value instanceof value.constructor;
}
