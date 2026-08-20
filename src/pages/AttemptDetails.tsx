import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "../../convex/_generated/dataModel";


import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

export default function AttemptDetails() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const searchParticipantId = searchParams.get("participant");

  const navigate = useNavigate();

  // Fallback to localStorage if search param was lost on refresh
  let participantId = searchParticipantId;
  if (sessionId && !participantId) {
    try {
      participantId = localStorage.getItem(`attempt_participant_${sessionId}`);
    } catch (e) {
      // ignore storage error
    }
  }

  useEffect(() => {
    if (sessionId && searchParticipantId) {
      try {
        localStorage.setItem(`attempt_participant_${sessionId}`, searchParticipantId);
      } catch (e) {
        // ignore storage error
      }
    }
  }, [sessionId, searchParticipantId]);

  const data = useQuery(
    api.sessions.getPlayerSessionData,
    sessionId && participantId
      ? {
        sessionId: sessionId as Id<"quiz_sessions">,
        participantId: participantId as Id<"participants">
      }
      : "skip"
  );
  const createMistakeMiniSession = useMutation(
    api.sessions.createMistakeMiniSession
  );

  const joinSession = useMutation(api.sessions.joinSession);

  if (!sessionId || !participantId) {
    return (
      <div className="p-10 space-y-4">
        <p>Invalid attempt link.</p>
        <Button variant="outline" onClick={() => navigate("/my-attempts")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Attempts
        </Button>
      </div>
    );
  }

  if (data === undefined) return <div className="p-10">Loading attempt...</div>;
  if (data === null) {
    return (
      <div className="p-10 space-y-4">
        <p>Attempt not found.</p>
        <Button variant="outline" onClick={() => navigate("/my-attempts")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Attempts
        </Button>
      </div>
    );
  }

  console.log("Params:", sessionId, participantId);
  console.log("sessionId:", sessionId);
  console.log("participantId:", participantId);

  const handleRetryMistakes = async () => {
    const result = await createMistakeMiniSession({
      originalSessionId: data.session._id,
      participantId: data.participant._id,
    });

    if (!result || !result.sessionId || !result.join_code) {
      alert("All mistakes already fixed!");
      return;
    }

    const joinResult = await joinSession({
      join_code: result.join_code,
      name: data.participant.name,
    });

    navigate(
      `/play/${joinResult.sessionId}?participant=${joinResult.participantId}`
    );
  };

  const originalScore =
    data.participantAnswers?.filter((a: any) => a.is_correct)?.length || 0;

  const questions = (data as any).questions || [];
  const participantAnswers = (data as any).participantAnswers || [];

  console.log("og score: ", originalScore)
  return (
    // <div className="p-10 space-y-4">
    //   <h1 className="text-2xl font-bold">{data.quiz.title}</h1>

    //   <p className="text-sm text-muted-foreground">
    //     Score: {data.participant.score} / {data.totalQuestions}
    //   </p>

    //   {data.participant.score < data.totalQuestions && (
    //     <Button onClick={handleRetryMistakes}>
    //       Fix My Mistakes
    //     </Button>
    //   )}
    <div className="max-w-4xl mx-auto px-6 pt-12 space-y-8">

      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold">{data.quiz.title}</h1>
        <p className="text-muted-foreground mt-1">
          Attempt Review
        </p>
      </div>

      {/* Score Summary */}
      <div className="border rounded-xl p-6 flex items-center justify-between">

        <div>
          <p className="text-sm text-muted-foreground">Original Quiz Score</p>
          <p className="text-2xl font-semibold">
            {originalScore} / {data.totalQuestions}
          </p>
        </div>

        {data.participant.score < data.totalQuestions && (
          <Button onClick={handleRetryMistakes}>
            Fix My Mistakes
          </Button>
        )}

      </div>

      {/* Placeholder for Analytics */}
      <div className="border rounded-xl p-6 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Analytics section coming soon...
        </p>
      </div>
    </div>
  );
}