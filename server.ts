// Custom Next.js server with WebSocket support for terminal PTY
import { createServer } from "http";
import { parse } from "url";
import { resolve } from "path";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import pty from "node-pty";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket, req) => {
    const url = parse(req.url || "", true);
    const cwd = (url.query.path as string) || "/workspace";

    // Spawn shell
    const shell = pty.spawn("bash", [], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        HOME: process.env.HOME || "/home/forge",
      },
    });

    shell.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    shell.onExit(() => {
      ws.close();
    });

    ws.on("message", (msg: Buffer) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === "data") {
          shell.write(parsed.data);
        } else if (parsed.type === "resize") {
          shell.resize(parsed.cols, parsed.rows);
        }
      } catch {
        // raw data
        shell.write(msg.toString());
      }
    });

    ws.on("close", () => {
      shell.kill();
    });
  });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname, query } = parse(req.url || "", true);
    if (pathname === "/api/terminal") {
      // Authenticate WebSocket connection
      const cookieHeader = req.headers.cookie ?? "";
      const sessionMatch = cookieHeader.match(/(?:^|;\s*)forgeos_session=([^;]+)/);
      const sessionToken = sessionMatch?.[1];
      if (!sessionToken) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      // Validate session in DB
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const session = await prisma.session.findUnique({ where: { token: sessionToken } }).catch(() => null);
      await prisma.$disconnect();
      if (!session || session.expiresAt < new Date()) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Validate cwd
      const cwd = (query.path as string) || "/workspace";
      const allowedRoots = ["/app", "/workspace"];
      const resolvedCwd = resolve(cwd);
      const cwdAllowed = allowedRoots.some(r => resolvedCwd === r || resolvedCwd.startsWith(r + "/"));
      if (!cwdAllowed) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, () => {
    console.log(`> ForgeOS ready on http://0.0.0.0:${port}`);
  });
});
