// that's newline-delimited JSON over WebSocket for you unhep cats
// and this is a hook that calls a function for each message received

import { useEffect, useRef } from "react";

export function useNDJSONWS(url: string, onMessage: (message: any) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onerror = (event) => {
      console.error(event);
    };

    ws.onopen = () => {
      console.log("WebSocket connection opened");
    };

    let buffer = "";

    ws.onmessage = (event) => {
      buffer += event.data;
      const messages = buffer.split("\n");
      buffer = messages.pop()!;
      for (const message of messages) {
        try {
          onMessageRef.current(JSON.parse(message));
        } catch (error) {
          console.error(error);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [url]);
}
