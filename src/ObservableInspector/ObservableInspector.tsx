/// <reference path="./ObservableInspector.d.ts" />

import { Inspector } from "@observablehq/inspector";
import { memo, useEffect, useState } from "react";

export type ObservableInspectorProps = {
  value?: unknown;
  error?: unknown;
};

export const ObservableInspector = memo(
  ({ value, error }: ObservableInspectorProps) => {
    const [elem, setElem] = useState<HTMLDivElement | null>(null);
    const [inspector, setInspector] = useState<Inspector | null>(null);

    useEffect(() => {
      setInspector(elem && new Inspector(elem));
    }, [elem]);

    useEffect(() => {
      if (inspector) {
        if (error) {
          inspector.rejected(error);
        } else {
          inspector.fulfilled(value);
        }
      }
    }, [error, inspector, value]);

    return (
      <>
        {/* <style>{css}</style> */}
        <div ref={setElem} />
      </>
    );
  },
);
