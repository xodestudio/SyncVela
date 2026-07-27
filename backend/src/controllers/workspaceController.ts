import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "./channelController";

// 1. CREATE WORKSPACE
export const createWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, imageUrl } = req.body;
    const userId = req.user!.userId;

    if (!name) {
      res.status(400).json({ error: "Workspace name is strictly required." });
      return;
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const newWorkspace = await tx.workspace.create({
        data: { name, imageUrl },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: newWorkspace.id,
          userId: userId,
          role: "OWNER",
        },
      });

      return newWorkspace;
    });

    const workspaceWithOwner = {
      ...workspace,
      ownerId: userId,
    };

    res.status(201).json(workspaceWithOwner);
  } catch (error) {
    console.error("❌ Workspace Creation Failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 2. GET USER'S WORKSPACES
export const getUserWorkspaces = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: { some: { userId: userId } },
      },
      include: {
        members: {
          where: { role: "OWNER" },
          select: { userId: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedWorkspaces = workspaces.map((ws) => {
      const ownerRecord = ws.members.find((m) => m.role === "OWNER");
      return {
        ...ws,
        ownerId: ownerRecord ? ownerRecord.userId : null,
      };
    });

    res.status(200).json(formattedWorkspaces);
  } catch (error) {
    console.error("❌ Fetching Workspaces Failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 3. JOIN WORKSPACE VIA INVITE CODE
export const joinWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const inviteCode = req.params.inviteCode as string;
    const userId = req.user!.userId;

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
      include: { members: true },
    });

    if (!workspace) {
      res.status(404).json({ error: "Invalid invite code." });
      return;
    }

    const isAlreadyMember = workspace.members.some((m) => m.userId === userId);
    if (isAlreadyMember) {
      res.status(400).json({
        error: "You are already in this workspace.",
        workspaceId: workspace.id,
      });
      return;
    }

    const newMemberRecord = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: userId,
        role: "MEMBER",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const io = req.app.get("socketio");

    if (io) {
      io.to(workspace.id).emit("workspace_member_joined", {
        workspaceId: workspace.id,
        user: newMemberRecord.user,
      });
    }

    res
      .status(200)
      .json({ message: "Joined successfully", workspaceId: workspace.id });
  } catch (error) {
    console.error("❌ Joining Workspace Failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 4. GET WORKSPACE MEMBERS
export const getWorkspaceMembers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const membersWithTime = await Promise.all(
      workspace.members.map(async (m) => {
        const lastMessage = await prisma.message.findFirst({
          where: { senderId: m.user.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        return {
          ...m.user,
          role: m.role,
          lastMessageAt: lastMessage ? lastMessage.createdAt : null,
        };
      }),
    );

    res.status(200).json(membersWithTime);
  } catch (error) {
    console.error("❌ Fetching Workspace Members Failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 5. DELETE WORKSPACE
export const deleteWorkspace = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;

    await prisma.$transaction(async (tx) => {
      const channels = await tx.channel.findMany({ where: { workspaceId } });
      const channelIds = channels.map((c) => c.id);

      if (channelIds.length > 0) {
        await tx.message.deleteMany({
          where: { channelId: { in: channelIds } },
        });
        await tx.channelMember.deleteMany({
          where: { channelId: { in: channelIds } },
        });
        await tx.channel.deleteMany({ where: { workspaceId } });
      }

      await tx.workspaceMember.deleteMany({ where: { workspaceId } });
      await tx.workspace.delete({ where: { id: workspaceId } });
    });

    const io = req.app.get("socketio");
    if (io) {
      io.to(workspaceId).emit("workspace_deleted", workspaceId);
    }

    res
      .status(200)
      .json({ success: true, message: "Workspace completely deleted." });
  } catch (error) {
    console.error("❌ Workspace Deletion Failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 6. UPDATE WORKSPACE MEMBER ROLE
export const updateWorkspaceMemberRole = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const workspaceId = req.body.workspaceId as string;
    const targetUserId = req.body.targetUserId as string;
    const newRole = req.body.newRole as string;
    const currentUserId = req.user!.userId;

    if (!workspaceId || !targetUserId || !newRole) {
      res.status(400).json({
        error: "Missing required fields: workspaceId, targetUserId, newRole",
      });
      return;
    }

    if (!["ADMIN", "MEMBER", "GUEST"].includes(newRole)) {
      res.status(400).json({
        error: "Invalid role assignment. Allowed values: ADMIN, MEMBER, GUEST",
      });
      return;
    }

    // EDGE CASE: Stop user from modifying their own role
    if (currentUserId === targetUserId) {
      res.status(400).json({ error: "You cannot change your own role." });
      return;
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });

    if (!targetMember) {
      res
        .status(404)
        .json({ error: "User is not a member of this workspace." });
      return;
    }

    if (targetMember.role === "OWNER") {
      res.status(400).json({
        error: "System Lock: Workspace Owner's role cannot be modified.",
      });
      return;
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      data: { role: newRole as any },
      include: { user: { select: { id: true, name: true } } },
    });

    // 🚀 THE QUARANTINE ENGINE FIX
    let revokedChannelIds: string[] = [];

    if (newRole === "GUEST") {
      // 🚨 DEMOTED TO GUEST: Strip access from ALL channels (Public & Private).
      // This enforces strict quarantine. The Admin must re-invite them manually.
      const allChannels = await prisma.channel.findMany({
        where: { workspaceId },
        select: { id: true },
      });
      revokedChannelIds = allChannels.map((c) => c.id);
    } else if (newRole === "MEMBER") {
      // 🚨 DEMOTED TO MEMBER: Only strip access from PRIVATE channels.
      // Members inherently have access to all PUBLIC channels.
      const privateChannels = await prisma.channel.findMany({
        where: { workspaceId, type: "PRIVATE" },
        select: { id: true },
      });
      revokedChannelIds = privateChannels.map((c) => c.id);
    }

    if (revokedChannelIds.length > 0) {
      await prisma.channelMember.deleteMany({
        where: { userId: targetUserId, channelId: { in: revokedChannelIds } },
      });
    }

    const io = req.app.get("socketio");
    if (io) {
      // Broadcast the role change to the workspace
      io.to(workspaceId).emit("member_role_updated", {
        workspaceId,
        userId: targetUserId,
        newRole,
      });

      // Force the demoted user's UI to wipe the revoked channels instantly
      if (revokedChannelIds.length > 0) {
        // Hum purana frontend event name "private_channels_revoked" hi use kar rahe hain
        // kyunke frontend filter logic explicitly private/public check nahi karti,
        // bas ID match kar ke channel sidebar se uda deti hai.
        io.to(targetUserId).emit("private_channels_revoked", {
          channelIds: revokedChannelIds,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully promoted ${updatedMember.user.name} to ${newRole}`,
    });
  } catch (error) {
    console.error("❌ Failed to update member role:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 7. KICK MEMBER FROM WORKSPACE
export const removeWorkspaceMember = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const targetUserId = req.params.userId as string;
    const currentUserId = req.user!.userId;

    if (currentUserId === targetUserId) {
      res
        .status(400)
        .json({ error: "You cannot kick yourself from the workspace." });
      return;
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    });

    if (!targetMember) {
      res.status(404).json({ error: "Member not found in this workspace." });
      return;
    }

    if (targetMember.role === "OWNER") {
      res
        .status(400)
        .json({ error: "System Lock: You cannot kick the Workspace Owner." });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const channels = await tx.channel.findMany({ where: { workspaceId } });
      const channelIds = channels.map((c) => c.id);

      if (channelIds.length > 0) {
        await tx.channelMember.deleteMany({
          where: { channelId: { in: channelIds }, userId: targetUserId },
        });
      }

      await tx.workspaceMember.delete({
        where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
      });
    });

    const io = req.app.get("socketio");
    if (io) {
      io.to(workspaceId).emit("member_kicked", {
        workspaceId,
        userId: targetUserId,
      });
      io.to(targetUserId).emit("workspace_revoked", workspaceId);
    }

    res.status(200).json({
      success: true,
      message: "Member successfully removed from workspace.",
    });
  } catch (error) {
    console.error("❌ Failed to kick member:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
