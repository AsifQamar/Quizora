// convex/sharing.ts
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper: Check if user is the original quiz creator/owner
export async function isQuizOwner(
  ctx: QueryCtx | MutationCtx,
  quizId: Id<"quizzes">,
  userId: string
): Promise<boolean> {
  const quiz = await ctx.db.get(quizId);
  return quiz !== null && quiz.creatorId === userId;
}

// Helper: Check if user has active host access to the quiz
export async function hasQuizHostAccess(
  ctx: QueryCtx | MutationCtx,
  quizId: Id<"quizzes">,
  userId: string
): Promise<boolean> {
  const access = await ctx.db
    .query("quiz_access")
    .withIndex("by_quiz_and_user", (q) =>
      q.eq("quizId", quizId).eq("userId", userId)
    )
    .first();
  return access !== null && access.status === "active";
}

// Helper: Check if user can edit the quiz (Owner OR Host)
export async function canEditQuiz(
  ctx: QueryCtx | MutationCtx,
  quizId: Id<"quizzes">,
  userId: string
): Promise<boolean> {
  const owner = await isQuizOwner(ctx, quizId, userId);
  if (owner) return true;
  return await hasQuizHostAccess(ctx, quizId, userId);
}

// Helper: Check if user can host the quiz (Owner OR Host)
export async function canHostQuiz(
  ctx: QueryCtx | MutationCtx,
  quizId: Id<"quizzes">,
  userId: string
): Promise<boolean> {
  const owner = await isQuizOwner(ctx, quizId, userId);
  if (owner) return true;
  return await hasQuizHostAccess(ctx, quizId, userId);
}

// Helper: Check if user can manage sharing/access (Owner ONLY)
export async function canManageSharing(
  ctx: QueryCtx | MutationCtx,
  quizId: Id<"quizzes">,
  userId: string
): Promise<boolean> {
  return await isQuizOwner(ctx, quizId, userId);
}

// Helper to generate a random 12-character token string
function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Mutation: Create or retrieve an active invite link for a quiz (Owner only)
export const createQuizInvite = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to create an invite link.");
    }

    const isOwner = await isQuizOwner(ctx, args.quizId, identity.subject);
    if (!isOwner) {
      throw new Error("Only the quiz owner can create an invite link.");
    }

    // Check if there is an existing pending invite
    const existingInvite = await ctx.db
      .query("quiz_invites")
      .withIndex("by_quiz_status", (q) =>
        q.eq("quizId", args.quizId).eq("status", "pending")
      )
      .first();

    if (existingInvite) {
      return { token: existingInvite.token, inviteId: existingInvite._id };
    }

    // Create new unpredictable token
    const token = generateInviteToken();
    const inviteId = await ctx.db.insert("quiz_invites", {
      quizId: args.quizId,
      token,
      createdBy: identity.subject,
      status: "pending",
      createdAt: Date.now(),
    });

    return { token, inviteId };
  },
});

// Query: Get invite link details for acceptance preview page
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("quiz_invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      return { valid: false, reason: "Invite link not found or invalid." };
    }

    if (invite.status === "revoked") {
      return { valid: false, reason: "This invite link has been revoked." };
    }

    const quiz = await ctx.db.get(invite.quizId);
    if (!quiz) {
      return { valid: false, reason: "The quiz associated with this invite no longer exists." };
    }

    // Get owner details
    const ownerUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", quiz.creatorId))
      .first();

    const identity = await ctx.auth.getUserIdentity();
    let isOwner = false;
    let hasAccess = false;

    if (identity) {
      isOwner = identity.subject === quiz.creatorId;
      hasAccess = await hasQuizHostAccess(ctx, quiz._id, identity.subject);
    }

    return {
      valid: true,
      token: invite.token,
      quizId: quiz._id,
      quizTitle: quiz.title,
      quizDescription: quiz.description,
      ownerName: ownerUser?.name || "Quiz Owner",
      ownerEmail: ownerUser?.email,
      isOwner,
      hasAccess,
      status: invite.status,
    };
  },
});

// Mutation: Accept a host invite link
export const acceptQuizInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to accept an invitation.");
    }
    const currentUserId = identity.subject;

    const invite = await ctx.db
      .query("quiz_invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      throw new Error("Invalid invitation token.");
    }

    if (invite.status === "revoked") {
      throw new Error("This invitation has been revoked.");
    }

    const quiz = await ctx.db.get(invite.quizId);
    if (!quiz) {
      throw new Error("The quiz for this invitation no longer exists.");
    }

    if (quiz.creatorId === currentUserId) {
      throw new Error("You are the owner of this quiz and already have full access.");
    }

    // Check existing host access record
    const existingAccess = await ctx.db
      .query("quiz_access")
      .withIndex("by_quiz_and_user", (q) =>
        q.eq("quizId", quiz._id).eq("userId", currentUserId)
      )
      .first();

    const now = Date.now();

    if (existingAccess) {
      if (existingAccess.status === "revoked") {
        // Reactivate access
        await ctx.db.patch(existingAccess._id, {
          status: "active",
          updatedAt: now,
        });
      }
      // If already active, keep active without duplicate
    } else {
      // Create new access record
      await ctx.db.insert("quiz_access", {
        quizId: quiz._id,
        userId: currentUserId,
        role: "host",
        grantedBy: quiz.creatorId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    return quiz._id;
  },
});

// Query: Get list of current active hosts for a quiz (Owner only)
export const getQuizHosts = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const isOwner = await isQuizOwner(ctx, args.quizId, identity.subject);
    if (!isOwner) return [];

    const accessRecords = await ctx.db
      .query("quiz_access")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    const activeRecords = accessRecords.filter((r) => r.status === "active");

    const hostDetails = await Promise.all(
      activeRecords.map(async (record) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", record.userId))
          .first();

        return {
          accessId: record._id,
          userId: record.userId,
          name: user?.name || "Host User",
          email: user?.email || "",
          imageUrl: user?.imageUrl,
          grantedAt: record.createdAt,
        };
      })
    );

    return hostDetails;
  },
});

// Mutation: Revoke a host's access to a quiz (Owner only)
export const revokeHostAccess = mutation({
  args: {
    quizId: v.id("quizzes"),
    hostUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to manage permissions.");
    }

    const isOwner = await isQuizOwner(ctx, args.quizId, identity.subject);
    if (!isOwner) {
      throw new Error("Only the quiz owner can revoke host access.");
    }

    const accessRecord = await ctx.db
      .query("quiz_access")
      .withIndex("by_quiz_and_user", (q) =>
        q.eq("quizId", args.quizId).eq("userId", args.hostUserId)
      )
      .first();

    if (accessRecord) {
      await ctx.db.patch(accessRecord._id, {
        status: "revoked",
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

// Query: Get shared quizzes where the current user is an active host
export const getSharedQuizzes = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const currentUserId = identity.subject;

    const accessRecords = await ctx.db
      .query("quiz_access")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .collect();

    const activeRecords = accessRecords.filter((r) => r.status === "active");

    const sharedQuizzes = await Promise.all(
      activeRecords.map(async (record) => {
        const quiz = await ctx.db.get(record.quizId);
        if (!quiz) return null;

        const ownerUser = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", quiz.creatorId))
          .first();

        return {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          creatorId: quiz.creatorId,
          ownerName: ownerUser?.name || "Quiz Owner",
          ownerEmail: ownerUser?.email,
          accessRole: "host",
          _creationTime: quiz._creationTime,
          sharedAt: record.createdAt,
        };
      })
    );

    return sharedQuizzes.filter((q): q is NonNullable<typeof q> => q !== null);
  },
});
