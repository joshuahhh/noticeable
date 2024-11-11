import { DOM } from "@engraft/shared/lib/DOM";
import hljs from "highlight.js";
import * as IDBKV from "idb-keyval";
import MarkdownIt from "markdown-it";
import {
  Fragment,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useChangingValue } from "./ChangingValue";
import { ObservableInspector } from "./ObservableInspector/ObservableInspector";
import { CellState, FrameworkishNotebook } from "./of-main";
import useInterval from "./useInterval";

// note that @types/wicg-file-system-access must be installed for
// window.showOpenFilePicker to be well-typed; there doesn't seem to
// be a way to enforce this :/

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

export const Files = memo(() => {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle>();

  const nbRef = useRef(new FrameworkishNotebook());

  const notebookState = useChangingValue(
    nbRef.current.notebookStateChangingValue,
  );

  const code = useFileContents(fileHandle) || "";

  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    nbRef.current.setNotebookCode(code);
  }, [code]);

  return (
    <div id="observablehq-center">
      <div id="observablehq-main" className="observablehq">
        <link
          rel="stylesheet"
          href="http://localhost:3000/_observablehq/theme-air,near-midnight.css"
        />
        <div className="flex flex-row gap-12">
          <FileSelector fileHandle={fileHandle} setFileHandle={setFileHandle} />
          {/* checkbox for debug mode */}
          <label>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => {
                setDebugMode(e.target.checked);
              }}
              className="mr-2"
            />
            debug mode
          </label>
        </div>
        <div className="w-full no-twp">
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
                        <ObservableInspector
                          error={state.variableState.error}
                        />
                      )}
                      {state.displays.map((display, i) => (
                        <Display key={i} value={display} />
                      ))}
                    </>
                  )}
                </Fragment>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
});

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

const FILE_KEY = "file";

export const FileSelector = memo(
  ({
    fileHandle,
    setFileHandle,
  }: {
    fileHandle: FileSystemFileHandle | undefined;
    setFileHandle: (fileHandle: FileSystemFileHandle) => void;
  }) => {
    const [initialFileHandle, setInitialFileHandle] = useState<
      FileSystemFileHandle | undefined
    >(undefined);

    useEffect(() => {
      (async () => {
        const maybeFileHandle = await IDBKV.get<FileSystemFileHandle>(FILE_KEY);
        if (maybeFileHandle) {
          if (
            (await maybeFileHandle.queryPermission({ mode: "read" })) ===
            "granted"
          ) {
            setFileHandle(maybeFileHandle);
          } else if (maybeFileHandle) {
            setInitialFileHandle(maybeFileHandle);
          }
        }
      })();
    }, [setFileHandle, setInitialFileHandle]);

    const onClickReload = useCallback(async () => {
      if (!initialFileHandle) {
        //  shouldn't happen
        return;
      }
      if (
        (await initialFileHandle.queryPermission({ mode: "read" })) ===
          "granted" ||
        (await initialFileHandle.requestPermission({ mode: "read" })) ===
          "granted"
      ) {
        setFileHandle(initialFileHandle);
      }
    }, [initialFileHandle, setFileHandle]);

    const onClickOpenFile = useCallback(async () => {
      const pickedFileHandles = await window.showOpenFilePicker();
      if (pickedFileHandles.length !== 1) {
        throw new Error("Expected one file");
      }
      const pickedFileHandle = pickedFileHandles[0];
      setFileHandle(pickedFileHandle);
      await IDBKV.set(FILE_KEY, pickedFileHandle);
    }, [setFileHandle]);

    return (
      <div className="flex flex-row gap-12 mb-12">
        {initialFileHandle && (
          <button
            onClick={onClickReload}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            reload
          </button>
        )}
        <button
          onClick={onClickOpenFile}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          open file
        </button>
        {fileHandle ? fileHandle.name : "No file selected"}
      </div>
    );
  },
);

function useFileContents(
  fileHandle?: FileSystemFileHandle,
  pollInterval: number = 100,
) {
  const [contents, setContents] = useState<string | null>(null);
  const lastCheckRef = useRef<null | {
    fileHandle: FileSystemFileHandle;
    lastModified: number;
  }>(null);

  useInterval(
    useCallback(async () => {
      if (!fileHandle) {
        setContents(null);
        return;
      }

      const file = await fileHandle.getFile();
      const lastModified = await file.lastModified;
      if (
        lastCheckRef.current?.fileHandle === fileHandle &&
        lastCheckRef.current.lastModified === lastModified
      ) {
        return;
      }
      lastCheckRef.current = { fileHandle, lastModified };
      const contents = await file.text();
      setContents(contents);
    }, [fileHandle]),
    pollInterval,
  );

  return contents;
}
