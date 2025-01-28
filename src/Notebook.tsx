import { DOM } from "@engraft/shared/lib/DOM";
import hljs from "highlight.js/lib/core";
import hljsTypescript from "highlight.js/lib/languages/typescript";
import MarkdownIt from "markdown-it";
import { isValidElement, memo, useEffect, useRef } from "react";
import { useChangingValue } from "./ChangingValue";
import { ErrorBoundary } from "./ErrorBoundary";
import { ObservableInspector } from "./ObservableInspector/ObservableInspector";
import { Cell, CellState, FrameworkishNotebook } from "./of-main";
import inputsCss from "./of/client/stdlib/inputs.css?raw";
import overridesCss from "./overrides.css?raw";
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
    debugMode = false,
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
        <style>{overridesCss}</style>
        {notebookState.cells.map((cell) => {
          return (
            <NotebookCell
              key={cell.id}
              cell={cell}
              state={notebookState.cellStates[cell.id] as CellState | undefined}
              debugMode={debugMode}
            />
          );
        })}
      </div>
    );
  },
);

export const NotebookCell = memo(
  ({
    cell,
    state,
    debugMode,
  }: {
    cell: Cell;
    state: CellState | undefined;
    debugMode: boolean;
  }) => {
    const { id, code } = cell;
    if (state?.type === "markdown") {
      return (
        <div
          key={id}
          dangerouslySetInnerHTML={{
            __html: md.render(state.markdown),
          }}
          style={{
            marginBottom: 20,
          }}
        />
      );
    } else {
      return (
        <div
          key={id}
          style={{
            marginBottom: 20,
            paddingLeft: 12,
            marginLeft: -12,
            boxShadow:
              !state || state.variableState.type === "pending"
                ? "-4px 0 0 0 #FFD70088"
                : state.variableState.type === "rejected"
                  ? "-4px 0 0 0 #F43F5E88"
                  : "-4px 0 0 0 #008C7688",
          }}
        >
          {debugMode && (
            <div>
              <hr style={{ padding: 8, margin: "0 -16px" }} />
              <div style={{ display: "flex", gap: 16 }}>
                <div>{id}</div>
                <div>
                  <ObservableInspector value={state} />
                </div>
              </div>
              {state && <pre>{state.transpiled}</pre>}
            </div>
          )}
          <div className="observablehq-pre-container" style={{ opacity: 0.3 }}>
            <pre
              dangerouslySetInnerHTML={{
                __html: hljs.highlight(code, { language: "tsx" }).value,
              }}
              style={{
                background: "initial",
              }}
            />
          </div>
          {state && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 4,
              }}
            >
              {state.variableState.type === "rejected" && (
                <ObservableInspector error={state.variableState.error} />
              )}
              {state.displays.map((display, i) => (
                // TODO: show old display while new one is pending
                <Display key={i} value={display} />
              ))}
              {Object.entries(state.outputs).map(([name, value]) => (
                <div key={name} style={{ display: "flex", gap: 8 }}>
                  <code style={{ whiteSpace: "nowrap", marginTop: 3 }}>
                    {name} ={" "}
                  </code>{" "}
                  <Display value={value} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  },
);

function Display({ value }: { value: unknown }) {
  if (isNode(value)) {
    return <DOM element={value as any} />;
  } else if (isValidElement(value)) {
    return <ErrorBoundary>{value}</ErrorBoundary>;
  } else {
    return <ObservableInspector value={value} />;
  }
}

// Note: Element.prototype is instanceof Node, but cannot be inserted!
function isNode(value: unknown): value is Node {
  return value instanceof Node && value instanceof value.constructor;
}
