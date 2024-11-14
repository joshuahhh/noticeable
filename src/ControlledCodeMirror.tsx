import { EditorState, Extension } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useMemo } from "react";
import { CodeMirror } from "./CodeMirror";

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

export function textListener(onChange: (text: string) => void) {
  return EditorView.updateListener.of((vu: ViewUpdate) => {
    if (vu.docChanged) {
      const doc = vu.state.doc;
      const text = doc.toString();
      onChange(text);
    }
  });
}
