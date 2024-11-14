#!/usr/bin/env node

import chokidar from "chokidar";
import express from "express";
import fsP from "fs/promises";
import getPort from "get-port";
import http from "http";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import yargs from "yargs";

async function main() {
  const argv = yargs(process.argv.slice(2))
    .command("* [notebook]", "", (yargs) =>
      yargs.positional("notebook", {
        type: "string",
      }),
    )
    .parseSync() as unknown as { notebook?: string };

  const app = express();

  app.use(express.static(fileURLToPath(new URL("../dist", import.meta.url))));

  // app.get("/", (req, res) => {
  //   res.send("hello");
  // });

  const PORT = await getPort();
  const httpServer = app.listen(PORT);

  if (argv.notebook) {
    await setUpNotebookWatch(argv.notebook, httpServer);
  }

  if (argv.notebook) {
    console.log(`Serving ${argv.notebook} on http://localhost:${PORT}/#/cli`);
  } else {
    console.log(`Waiting to load a notebook on http://localhost:${PORT}/`);
  }
}

// TODO: copy-paste-sync
type Message = { type: "code-update"; code: string };

function send(ws: WebSocket, message: Message) {
  ws.send(JSON.stringify(message) + "\n");
}

async function setUpNotebookWatch(notebook: string, server: http.Server) {
  const wss = new WebSocketServer({ server });

  let connections: Set<WebSocket> = new Set();

  let code = await fsP.readFile(notebook, "utf-8");

  chokidar.watch(notebook).on("all", async () => {
    code = await fsP.readFile(notebook, "utf-8");
    connections.forEach((ws) => send(ws, { type: "code-update", code }));
  });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    connections.add(ws);

    send(ws, { type: "code-update", code });

    ws.on("close", () => {
      console.log("Client disconnected");
      connections.delete(ws);
    });
  });
}

main();
