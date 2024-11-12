import * as IDBKV from "idb-keyval";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Notebook } from "./Notebook";
import useInterval from "./useInterval";
import { useNDJSONWS } from "./useNDJSONWS";

// note that @types/wicg-file-system-access must be installed for
// window.showOpenFilePicker to be well-typed; there doesn't seem to
// be a way to enforce this :/

// TODO: copy-paste-sync
type Message = { type: "code-update"; code: string };

export const Files = memo(() => {
  // const [fileHandle, setFileHandle] = useState<FileSystemFileHandle>();
  // const code = useFileContents(fileHandle) || "";
  const [debugMode, setDebugMode] = useState(false);

  const [code, setCode] = useState<string>("");

  useNDJSONWS(
    "/",
    useCallback((message: Message) => {
      if (message.type === "code-update") {
        setCode(message.code);
      }
    }, []),
  );

  return (
    <div id="observablehq-center">
      <div className="flex flex-row gap-12">
        {/* <FileSelector fileHandle={fileHandle} setFileHandle={setFileHandle} /> */}
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
      <Notebook code={code} debugMode={debugMode} />
    </div>
  );
});

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
