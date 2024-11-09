import { EditorState, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import sha256 from "crypto-js/sha256";
import { useMemo } from "react";
import { CodeMirror } from "./CodeMirror";

export function textListener(onChange: (text: string) => void) {
  return EditorView.updateListener.of((vu: ViewUpdate) => {
    if (vu.docChanged) {
      const doc = vu.state.doc;
      const text = doc.toString();
      onChange(text);
    }
  });
}

export function ControlledCodeMirror({
  extensions,
  value,
  setValue,
}: {
  extensions?: Extension;
  value: string;
  setValue?: (value: string) => void;
}) {
  const allExtensions = useMemo(
    () => [
      basicSetup,
      setValue ? textListener(setValue) : EditorState.readOnly.of(true),
      extensions ?? [],
    ],
    [extensions, setValue],
  );

  return <CodeMirror initialDoc={value} extensions={allExtensions} />;
}

export function compileExpression(exprCode: string): unknown {
  // eslint-disable-next-line no-new-func
  return new Function(`return (${exprCode});`)();
}

export function uniqueCodeId(
  content: string,
  existingIds: { [id: string]: boolean },
): string {
  const hash = sha256(content).toString().slice(0, 8);
  let id = hash;
  let count = 1;
  while (existingIds[id]) {
    id = `${hash}-${count}`;
    count++;
  }

  return id;
}

export function assignIds(codes: string[]): { id: string; code: string }[] {
  let existingIds: { [id: string]: boolean } = {};
  return codes.map((code) => {
    const id = uniqueCodeId(code, existingIds);
    existingIds[id] = true;
    return { id, code };
  });
}
