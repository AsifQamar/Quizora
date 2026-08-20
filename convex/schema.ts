// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 'users' table - stores Clerk user info
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    lastSeen: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // 'quizzes' table
  quizzes: defineTable({
    creatorId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
  }).index("by_creator", ["creatorId"]),

  // 'questions' table
  questions: defineTable({
    quizId: v.id("quizzes"), // Links to the 'quizzes' table
    question_text: v.string(),
    question_image_url: v.optional(v.string()),
    option_a: v.string(),
    option_b: v.string(),
    option_c: v.optional(v.string()),
    option_d: v.optional(v.string()),
    correct_answer: v.string(),
    time_limit: v.number(),
    order_number: v.number(),
  })
    .index("by_quizId_order", ["quizId", "order_number"]),

  // 'quiz_sessions' table for live rooms
  quiz_sessions: defineTable({
    quizId: v.id("quizzes"),
    hostId: v.string(),
    join_code: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("finished")
    ),
    current_question_index: v.number(),
    show_leaderboard: v.boolean(),
    // Optional flag to indicate that the host has revealed the correct answer
    reveal_answer: v.optional(v.boolean()),
    // Optional flag to indicate that the host ended the quiz early
    ended_early: v.optional(v.boolean()),

    // --- Write-side metadata for O(1) lookups ---
    // Cached total number of questions (set at session creation)
    total_questions: v.optional(v.number()),
    // Direct reference to the current question document (avoids index scan)
    current_question_id: v.optional(v.id("questions")),

    // Server-authoritative timestamps (Unix ms) for timer sync:
    //   clients compute  t_remaining = currentQuestionEndTime - Date.now()
    currentQuestionStartTime: v.optional(v.number()),
    currentQuestionEndTime: v.optional(v.number()),
    mode: v.optional(v.string()),
    customQuestionIds: v.optional(v.array(v.id("questions"))),
    originalSessionId: v.optional(v.id("quiz_sessions")),
    originalParticipantId: v.optional(v.id("participants")),

  }).index("by_join_code", ["join_code"]),

  // 'participants' table for players
  participants: defineTable({
    sessionId: v.id("quiz_sessions"),
    name: v.string(),
    score: v.number(),
    userId:v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId_score", ["sessionId", "score"]),
  // wrong answer table
  participant_answers: defineTable({
    sessionId: v.id("quiz_sessions"),
    participantId: v.id("participants"),
    questionId: v.id("questions"),
    selected_answer: v.string(),
    is_correct: v.boolean(),
  })
  .index("by_participant_session", ["participantId", "sessionId"])
  .index("by_session", ["sessionId"]),

  // 'answers' table
  answers: defineTable({
    sessionId: v.id("quiz_sessions"),
    participantId: v.id("participants"),
    questionId: v.id("questions"),
    answer: v.string(), 
    is_correct: v.boolean(),
    mode: v.optional(v.string()),
    customQuestionIds: v.optional(v.array(v.id("questions"))),
    score: v.number(),
    time_taken: v.number(), // Time in seconds (validated client-side time)
  })
    .index("by_session_question", ["sessionId", "questionId"])
    .index("by_participant_question", ["participantId", "questionId"])
    .index("by_session_question_time", ["sessionId", "questionId", "time_taken"])
    .index("by_participant_session", ["participantId", "sessionId"]),

  // 'quiz_access' table for shared host permissions
  quiz_access: defineTable({
    quizId: v.id("quizzes"),
    userId: v.string(), // Clerk user ID of the host
    role: v.literal("host"),
    grantedBy: v.string(), // Clerk user ID of the owner
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_quiz", ["quizId"])
    .index("by_user", ["userId"])
    .index("by_quiz_and_user", ["quizId", "userId"]),

  // 'quiz_invites' table for host invitation links
  quiz_invites: defineTable({
    quizId: v.id("quizzes"),
    token: v.string(), // Unique unpredictable token
    createdBy: v.string(), // Clerk user ID of the creator/owner
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_quiz", ["quizId"])
    .index("by_quiz_status", ["quizId", "status"]),
});