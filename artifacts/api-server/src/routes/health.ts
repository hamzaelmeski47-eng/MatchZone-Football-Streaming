import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool, isDatabaseConnected } from "../database/mysql";
import { asyncHandler } from "../utils/async-handler";

const router: IRouter = Router();

router.get("/healthz", asyncHandler(async (_req, res) => {
  if (isDatabaseConnected) {
    try {
      await pool.query("SELECT 1");
    } catch {
      // ignore if db is unreachable
    }
  }
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}));

export default router;
