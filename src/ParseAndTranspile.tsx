import { javascript } from "@codemirror/lang-javascript";
import { memo, useRef, useState } from "react";
import { Inspector } from "react-inspector";
import { parseJavaScript } from "./of/javascript/parse";
import { transpileJavaScript } from "./of/javascript/transpile";
import { ControlledCodeMirror } from "./shared";

const jsExtensions = [javascript()];

export const ParseAndTranspile = memo(() => {
  const [code, setCode] = useState(`const a = 1;`);

  return (
    <div className="prose p-6">
      <h1>parse & transpile</h1>
      <ControlledCodeMirror
        value={code}
        setValue={setCode}
        extensions={jsExtensions}
      />
      <Debugger code={code} />
    </div>
  );
});

const Debugger = memo(({ code }: { code: string }) => {
  const lastGoodRef = useRef(<></>);

  try {
    const parsed = parseJavaScript(code, { path: "SOMEPATH" });
    const transpiled = transpileJavaScript(parsed, {
      id: "SOMEID",
      path: "SOMEPATH",
    });
    const parsedCopy: any = { ...parsed };
    delete parsedCopy.body;
    parsedCopy.body = parsed.body;
    return (lastGoodRef.current = (
      <>
        <pre>{transpiled}</pre>
        <Inspector data={parsedCopy} table={false} expandLevel={10} />
      </>
    ));
  } catch (e) {
    return (
      <div className="relative">
        {lastGoodRef.current}
        <pre className="bg-red-900 absolute right-10 top-10 m-0 opacity-50">
          {(e as any).message}
        </pre>
      </div>
    );
  }
});
