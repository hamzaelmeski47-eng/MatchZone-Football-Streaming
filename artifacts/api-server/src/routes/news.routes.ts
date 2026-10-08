import { Router, type Request, type Response } from "express";
import { getLiveFootballNews, getNewsArticleById } from "../services/news.service";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

/**
 * GET /api/news
 * Query params:
 *   - category: 'all' | 'champions' | 'premier' | 'laliga' | 'transfers' | 'international'
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const category = typeof req.query.category === "string" ? req.query.category : "all";
    const articles = await getLiveFootballNews(category);
    res.json({
      success: true,
      category,
      count: articles.length,
      data: articles,
    });
  })
);

/**
 * GET /api/news/:id
 * Retrieve a specific news article by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId || "");
    const article = await getNewsArticleById(id);
    if (!article) {
      res.status(404).json({ success: false, message: "المقال غير موجود" });
      return;
    }
    res.json({
      success: true,
      data: article,
    });
  })
);

export default router;
