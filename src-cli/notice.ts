import chokidar from "chokidar";
import express from "express";
import fsP from "fs/promises";
import { WebSocket, WebSocketServer } from "ws";
import yargs from "yargs";

console.log(process.cwd());

// serve ../dist

const argv = yargs(process.argv.slice(2))
  .command("* <script>", "run a script", (yargs) =>
    yargs.positional("script", {
      type: "string",
    }),
  )
  .parseSync() as unknown as { script: string };

const app = express();

app.use(express.static("dist"));

// app.get("/", (req, res) => {
//   res.send("hello");
// });

const PORT = 8080;
const httpServer = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // this.#readyResolvers.forEach((resolve) => resolve(true))
});

const wss = new WebSocketServer({ server: httpServer });

let connections: Set<WebSocket> = new Set();

let code = "";
// TODO: main function or something?
(async () => {
  code = await fsP.readFile(argv.script, "utf-8");
})();

chokidar.watch(argv.script).on("all", async () => {
  code = await fsP.readFile(argv.script, "utf-8");
  sendAll({ type: "code-update", code });
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

// TODO: copy-paste-sync
type Message = { type: "code-update"; code: string };

function send(ws: WebSocket, message: Message) {
  ws.send(JSON.stringify(message) + "\n");
}

function sendAll(message: Message) {
  connections.forEach((ws) => send(ws, message));
}
