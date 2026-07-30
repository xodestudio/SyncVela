import { useEffect } from "react";
import { useChatStore } from "@/src/store/chat";
import { useAuthStore } from "@/src/store/authStore";
import { authFetch } from "@/src/lib/authFetch";

export const useWorkspaceEvents = (socket: any) => {
  useEffect(() => {
    if (!socket) return;
    const chatState = useChatStore.getState;

    const handleMemberJoined = (data: { workspaceId: string; user: any }) => {
      const { activeWorkspaceId, users, setUsers } = chatState();

      if (activeWorkspaceId === data.workspaceId) {
        const isDuplicate = users.some((u) => u.id === data.user.id);
        if (!isDuplicate) {
          console.log("🟢 Real-time User Joined:", data.user.name);
          setUsers([...users, { ...data.user, unreadCount: 0 }]);
        }
      }
    };

    const handleRoleUpdated = async (data: {
      workspaceId: string;
      userId: string;
      newRole: string;
    }) => {
      const state = chatState();
      const { user } = useAuthStore.getState();

      if (state.activeWorkspaceId === data.workspaceId) {
        if (user && user.id === data.userId) {
          const previousRole = state.currentUserRole;

          console.log(
            `⚡ Security Cleared: My role updated from ${previousRole} to: ${data.newRole}`,
          );
          state.setCurrentUserRole(data.newRole);

          if (previousRole === "GUEST" && data.newRole !== "GUEST") {
            try {
              const res = await authFetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/channels/${data.workspaceId}`,
              );
              if (res.ok) {
                const freshChannels = await res.json();
                chatState().setChannels(freshChannels);
              }
            } catch (err) {
              console.error(
                "❌ Failed to hydrate channels after promotion",
                err,
              );
            }
          }
        }

        state.setUsers(
          state.users.map((u) =>
            u.id === data.userId ? { ...u, role: data.newRole } : u,
          ),
        );
      }
    };

    const handleMemberKicked = (data: {
      workspaceId: string;
      userId: string;
    }) => {
      const state = chatState();

      if (state.activeWorkspaceId === data.workspaceId) {
        state.setUsers(state.users.filter((u) => u.id !== data.userId));

        if (state.selectedUser?.id === data.userId) {
          state.setSelectedUser(null);
        }
      }
    };

    const handleWorkspaceRevoked = (workspaceId: string) => {
      const state = chatState();

      if (state.activeWorkspaceId === workspaceId) {
        alert(
          "🚨 Security Alert: Your access to this workspace has been revoked by the administrator.",
        );

        state.setActiveWorkspaceId(null);
        state.setActiveChannelId(null);
        state.setSelectedUser(null);
        localStorage.removeItem("lastActiveWorkspaceId");
        window.location.href = "/";
      }
    };

    const handlePrivateChannelsRevoked = ({
      channelIds,
    }: {
      channelIds: string[];
    }) => {
      const state = chatState();
      const revokedSet = new Set(channelIds);

      state.setChannels(state.channels.filter((c) => !revokedSet.has(c.id)));

      if (state.activeChannelId && revokedSet.has(state.activeChannelId)) {
        state.setActiveChannelId(null);
      }
    };

    // 🚀 THE REAL-TIME WORKSPACE DELETION RADAR
    const handleWorkspaceDeleted = (deletedWorkspaceId: string) => {
      const state = chatState();
      const updatedWorkspaces = state.workspaces.filter(
        (w) => w.id !== deletedWorkspaceId,
      );

      state.setWorkspaces(updatedWorkspaces);

      if (state.activeWorkspaceId === deletedWorkspaceId) {
        alert("The workspace you were viewing has been deleted by the owner.");

        state.setChannels([]);
        state.setUsers([]);
        state.setMessages([]);
        state.setActiveChannelId(null);
        state.setSelectedUser(null);

        if (updatedWorkspaces.length > 0) {
          const nextWs = updatedWorkspaces[0];
          state.setActiveWorkspaceId(nextWs.id);
          localStorage.setItem("lastActiveWorkspaceId", nextWs.id);
        } else {
          state.setActiveWorkspaceId(null);
          localStorage.removeItem("lastActiveWorkspaceId");
          window.location.href = "/create-workspace";
        }
      }
    };

    // BIND SOCKET LISTENERS
    socket.on("workspace_member_joined", handleMemberJoined);
    socket.on("member_role_updated", handleRoleUpdated);
    socket.on("member_kicked", handleMemberKicked);
    socket.on("workspace_revoked", handleWorkspaceRevoked);
    socket.on("private_channels_revoked", handlePrivateChannelsRevoked);
    socket.on("workspace_deleted", handleWorkspaceDeleted);

    return () => {
      socket.off("workspace_member_joined", handleMemberJoined);
      socket.off("member_role_updated", handleRoleUpdated);
      socket.off("member_kicked", handleMemberKicked);
      socket.off("workspace_revoked", handleWorkspaceRevoked);
      socket.off("private_channels_revoked", handlePrivateChannelsRevoked);
      socket.off("workspace_deleted", handleWorkspaceDeleted);
    };
  }, [socket]);
};
