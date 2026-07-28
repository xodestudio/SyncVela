import { Router } from "express";
import {
  createChannel,
  getWorkspaceChannels,
  markChannelAsRead,
  inviteToChannel,
  getChannelMembers,
} from "../controllers/channelController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { requirePermission } from "../middlewares/rbacMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/", requirePermission("CREATE_CHANNEL"), createChannel);
router.get("/:workspaceId", getWorkspaceChannels);
router.post("/mark-read", markChannelAsRead);
router.post("/:channelId/invite", inviteToChannel);
router.get("/:channelId/members", getChannelMembers);

export default router;
