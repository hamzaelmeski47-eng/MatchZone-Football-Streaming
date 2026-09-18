import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  getNotifications,
  markRead,
} from "../controllers/notifications.controller";
import { notificationParamsSchema } from "../validators/common.schemas";
import { notificationQuerySchema } from "../validators/notification.schemas";

const router = Router();

router.use(authenticate);
router.get(
  "/",
  validate(notificationQuerySchema, "query"),
  asyncHandler(getNotifications),
);
router.patch(
  "/:id/read",
  validate(notificationParamsSchema, "params"),
  asyncHandler(markRead),
);

export default router;