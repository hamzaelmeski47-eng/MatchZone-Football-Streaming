import { z } from "zod";

export const notificationQuerySchema = z.object({
  unreadOnly: z
    .union([z.literal("true"), z.literal("false")])
    .transform((value) => value === "true")
    .optional(),
});