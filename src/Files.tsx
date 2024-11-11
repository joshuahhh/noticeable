import { javascript } from "@codemirror/lang-javascript";
import { DOM } from "@engraft/shared/lib/DOM";
import * as IDBKV from "idb-keyval";
import MarkdownIt from "markdown-it";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ObservableInspector } from "./ObservableInspector/ObservableInspector";
import { FrameworkishNotebook, NotebookState } from "./of-main";
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

const jsExtensions = [javascript()];

export const Files = memo(() => {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle>();

  const [notebookState, setNotebookState] = useState<NotebookState>({
    cells: [],
    cellStates: {},
  });

  const nbRef = useRef(new FrameworkishNotebook(setNotebookState));

  const code = useFileContents(fileHandle) || "";

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
        <style>
          {/* TODO: tailwind is overwriting default styles which observable expects */}
          {`h1 {
            font-size: 2em;
            font-weight: 700;
          }`}
        </style>
        <FileSelector fileHandle={fileHandle} setFileHandle={setFileHandle} />
        <div className="w-full">
          {notebookState.cells.map(({ id, code }) => {
            const state = notebookState.cellStates[id];
            if (state.type === "markdown") {
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
                <div key={id} className="mb-10">
                  {/* <h4>{id}</h4> */}
                  <pre>{code}</pre>
                  {state.displays.map((display, i) => (
                    <Display key={i} value={display} />
                  ))}
                </div>
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
            Reload
          </button>
        )}
        <button
          onClick={onClickOpenFile}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Open File
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
