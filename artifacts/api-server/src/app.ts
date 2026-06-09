import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust Render / reverse-proxy (required for secure cookies over HTTPS)
app.set("trust proxy", 1);

// ── Uploads directory ────────────────────────────────────────────────────────
const uploadsDir = path.resolve(
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads"),
);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "mao-biz-secret-fallback",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "lax" : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// Uploaded images
app.use("/api/uploads", express.static(uploadsDir));

// API routes
app.use("/api", router);

// ── Serve built React frontend ───────────────────────────────────────────────
// Try several candidate paths so it works on Render, locally, and in Docker.
// esbuild banner sets globalThis.__dirname to the dir of dist/index.mjs.
const candidatePaths = [
  // Render / prod: process.cwd() is the repo root
  path.resolve(process.cwd(), "artifacts/mao-biz/dist/public"),
  // Relative to compiled API dist dir (artifacts/api-server/dist/)
  path.resolve(globalThis.__dirname ?? __dirname, "../../../artifacts/mao-biz/dist/public"),
  // Same dir as binary — in case someone copies things around
  path.resolve(globalThis.__dirname ?? __dirname, "../../mao-biz/dist/public"),
];

const frontendDist = candidatePaths.find((p) => fs.existsSync(p));

if (frontendDist) {
  logger.info({ frontendDist }, "Serving frontend static files");
  app.use(express.static(frontendDist));

  // SPA fallback — React handles routing client-side (Express 5: use /{*path})
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  logger.warn(
    { tried: candidatePaths },
    "Frontend dist not found — run: PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/mao-biz run build",
  );

  // Give a helpful error instead of the cryptic Express "Cannot GET /"
  app.get("/{*path}", (_req, res) => {
    res.status(503).send(
      "<h2>MAO-BIZ — Frontend non trouvé</h2><p>Le build du frontend n'a pas été inclus dans la commande de build.</p>",
    );
  });
}

export default app;
