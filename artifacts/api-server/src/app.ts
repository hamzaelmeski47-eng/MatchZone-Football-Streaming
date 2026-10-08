import path from "node:path";
import fs from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Anti-clickjacking & iframe nesting protection
app.use((req, res, next) => {
  if (req.path.startsWith("/api/streams/clean-embed")) {
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
  } else {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
  }
  next();
});

app.use("/api", router);

// Serve frontend static files when built
const candidatePaths = [
  path.resolve(__dirname, "../../matchzone/dist/public"),
  path.resolve(process.cwd(), "artifacts/matchzone/dist/public"),
];
const publicDir = candidatePaths.find((p) => fs.existsSync(p));

if (publicDir) {
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(publicDir, "index.html"));
    }
    next();
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
