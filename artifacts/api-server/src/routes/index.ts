import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth.routes";
import matchesRouter from "./matches.routes";
import teamsRouter from "./teams.routes";
import competitionsRouter from "./competitions.routes";
import favoritesRouter from "./favorites.routes";
import streamsRouter from "./streams.routes";
import notificationsRouter from "./notifications.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/matches", matchesRouter);
router.use("/teams", teamsRouter);
router.use("/competitions", competitionsRouter);
router.use("/favorites", favoritesRouter);
router.use("/streams", streamsRouter);
router.use("/notifications", notificationsRouter);

export default router;
