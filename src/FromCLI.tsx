import { memo, useCallback, useState } from "react";
import { Notebook } from "./Notebook";
import { useNDJSONWS } from "./useNDJSONWS";

// TODO: copy-paste-sync
type Message = { type: "code-update"; code: string };

export const FromCLI = memo(() => {
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
