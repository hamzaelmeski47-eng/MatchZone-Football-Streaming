import { once } from "node:events";
import { spawn } from "node:child_process";
import net from "node:net";
import mysql from "mysql2/promise";

const expectedTables = [
  "users",
  "competitions",
  "teams",
  "matches",
  "match_events",
  "lineups",
  "favorites",
  "streams",
  "notifications",
];

const healthTimeoutMs = Number(process.env.SMOKE_HEALTH_TIMEOUT_MS || 30_000);
const requestTimeoutMs = 1_000;

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to run the API startup smoke check`);
  }
  return value;
}

async function findAvailablePort() {
  if (process.env.SMOKE_PORT) {
    return Number(process.env.SMOKE_PORT);
  }

  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  server.close();
  await once(server, "close");
  return port;
}

function databaseConfig(databaseUrl) {
  const url = new URL(databaseUrl);
  if (!["mysql:", "mysql2:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must use the mysql:// or mysql2:// protocol");
  }

  const database = url.pathname.replace(/^\/+/, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    charset: "utf8mb4",
    timezone: "Z",
  };
}

function captureOutput(stream) {
  const chunks = [];
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    chunks.push(chunk);
    if (chunks.join("").length > 8_000) {
      chunks.splice(0, chunks.length, chunks.join("").slice(-8_000));
    }
  });
  return () => chunks.join("");
}

async function waitForHealthyApi(child, port) {
  const deadline = Date.now() + healthTimeoutMs;
  let lastError = "no response";

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `API exited before becoming healthy (exit code ${child.exitCode})`,
      );
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`, {
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      const body = await response.json();

      if (response.ok && body.status === "ok") {
        return body;
      }

      lastError = `HTTP ${response.status}: ${JSON.stringify(body)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `API did not become healthy within ${healthTimeoutMs}ms: ${lastError}`,
  );
}

async function verifyTables(databaseUrl) {
  const connection = await mysql.createConnection(databaseConfig(databaseUrl));

  try {
    const [rows] = await connection.query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_TYPE = 'BASE TABLE'`,
    );
    const actualTables = rows.map((row) => row.TABLE_NAME);
    const missingTables = expectedTables.filter(
      (table) => !actualTables.includes(table),
    );

    if (missingTables.length > 0) {
      throw new Error(`Missing MatchZone tables: ${missingTables.join(", ")}`);
    }

    return actualTables;
  } finally {
    await connection.end();
  }
}

async function stopProcess(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function main() {
  const databaseUrl = requireEnvironment(
    process.env.SMOKE_DATABASE_URL ? "SMOKE_DATABASE_URL" : "DATABASE_URL",
  );
  const jwtSecret = requireEnvironment(
    process.env.SMOKE_JWT_SECRET ? "SMOKE_JWT_SECRET" : "JWT_SECRET",
  );
  const port = await findAvailablePort();
  const child = spawn(
    process.execPath,
    ["--enable-source-maps", "./dist/index.mjs"],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        JWT_SECRET: jwtSecret,
        NODE_ENV: "test",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const getStdout = captureOutput(child.stdout);
  const getStderr = captureOutput(child.stderr);

  try {
    const health = await waitForHealthyApi(child, port);
    const tables = await verifyTables(databaseUrl);
    console.log(
      `API startup smoke check passed: /api/healthz returned ${health.status}; verified ${expectedTables.length} MatchZone tables (${tables.join(", ")}).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const logs = [getStdout(), getStderr()].filter(Boolean).join("\n");
    throw new Error(logs ? `${message}\nAPI logs:\n${logs}` : message);
  } finally {
    await stopProcess(child);
  }
}

main().catch((error) => {
  console.error(
    `API startup smoke check failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
