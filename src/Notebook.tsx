import { DOM } from "@engraft/shared/lib/DOM";
import hljs from "highlight.js/lib/core";
import hljsTypescript from "highlight.js/lib/languages/typescript";
import MarkdownIt from "markdown-it";
import { Fragment, isValidElement, memo, useEffect, useRef } from "react";
import { useChangingValue } from "./ChangingValue";
import { ObservableInspector } from "./ObservableInspector/ObservableInspector";
import { CellState, FrameworkishNotebook } from "./of-main";
import inputsCss from "./of/client/stdlib/inputs.css?raw";
import themeCss from "./theme-air,near-midnight.css?raw";

hljs.registerLanguage("tsx", hljsTypescript);

export function createMarkdownIt({
  markdownIt,
  linkify = true,
  quotes = "“”‘’",
  typographer = false,
}: {
  markdownIt?: (md: MarkdownIt) => MarkdownIt;
  linkify?: boolean;
  quotes?: string | string[];
  typographer?: boolean;
} = {}): MarkdownIt {
  const md = MarkdownIt({ html: true, linkify, typographer, quotes });
  if (linkify) {
    md.linkify.set({ fuzzyLink: false, fuzzyEmail: false });
  }
  // md.use(MarkdownItAnchor, { slugify: (s) => slugify(s) });
  // md.inline.ruler.push("placeholder", transformPlaceholderInline);
  // md.core.ruler.after("inline", "placeholder", transformPlaceholderCore);
  // md.renderer.rules.placeholder = makePlaceholderRenderer();
  // md.renderer.rules.fence = makeFenceRenderer(md.renderer.rules.fence!);
  // md.renderer.rules.softbreak = makeSoftbreakRenderer(
  //   md.renderer.rules.softbreak!,
  // );
  return markdownIt === undefined ? md : markdownIt(md);
}

const md = createMarkdownIt();

export const Notebook = memo(
  ({
    code,
    debugMode,
    builtins,
    global,
  }: {
    code: string;
    debugMode?: boolean;
    builtins?: any;
    global?: any;
  }) => {
    const nbRef = useRef(new FrameworkishNotebook(builtins, global));

    const notebookState = useChangingValue(
      nbRef.current.notebookStateChangingValue,
    );

    useEffect(() => {
      nbRef.current.setNotebookCode(code);
    }, [code]);

    return (
      <div id="observablehq-main" className="observablehq">
        <style>{themeCss}</style>
        <style>{inputsCss}</style>
        {notebookState.cells.map(({ id, code }) => {
          const state = notebookState.cellStates[id] as CellState | undefined;
          if (state?.type === "markdown") {
            return (
              <div
                key={id}
                dangerouslySetInnerHTML={{
                  __html: md.render(state.markdown),
                }}
              />
            );
          } else {
            return (
              <Fragment key={id}>
                {debugMode && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-row gap-4">
                      <div>{id}</div>
                      <div>
                        <ObservableInspector value={state} />
                      </div>
                    </div>
                    {state && <pre>{state.transpiled}</pre>}
                  </div>
                )}
                <div className="observablehq-pre-container">
                  <pre
                    dangerouslySetInnerHTML={{
                      __html: hljs.highlight(code, { language: "tsx" }).value,
                    }}
                  />
                </div>
                {state && (
                  <>
                    {state.variableState.type === "rejected" && (
                      <ObservableInspector error={state.variableState.error} />
                    )}
                    {state.displays.map((display, i) => (
                      // TODO: show old display while new one is pending
                      <Display key={i} value={display} />
                    ))}
                  </>
                )}
              </Fragment>
            );
          }
        })}
      </div>
    );
  },
);

function Display({ value }: { value: unknown }) {
  if (isNode(value)) {
    return <DOM element={value as any} />;
  } else if (isValidElement(value)) {
    return value;
  } else {
    return <ObservableInspector value={value} />;
  }
}

// Note: Element.prototype is instanceof Node, but cannot be inserted!
function isNode(value: unknown): value is Node {
  return value instanceof Node && value instanceof value.constructor;
}
