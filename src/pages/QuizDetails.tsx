import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Share2, Loader2, Edit } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ShareQuizModal } from "@/components/ShareQuizModal";

const QuizDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  // Fetch quiz data
  const quizData = useQuery(
    api.quizzes.getQuizDetails,
    id ? { id: id as Id<"quizzes"> } : "skip"
  );
  const quiz = quizData?.quiz;
  const questions = quizData?.questions;
  const sortedQuestions = questions
    ? [...questions].sort((a, b) => a.order_number - b.order_number)
    : [];
  const isOwner = quizData?.isOwner;
  const isHost = quizData?.isHost;
  const canShare = quizData?.canShare;
  const ownerName = quizData?.ownerName || "Quiz Owner";

  const createSessionMutation = useMutation(api.sessions.createSession);

  const startQuiz = async () => {
    if (!id) return;

    if (!isLoaded) {
      toast({
        title: "Loading...",
        description: "Please wait while we verify your authentication"
      });
      return;
    }

    if (!isSignedIn) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to host a quiz",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const sessionId = await createSessionMutation({
        quizId: id as Id<"quizzes">,
      });
      navigate(`/host/${sessionId}`);
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to start quiz: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (quizData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (quizData === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Quiz Not Found</h1>
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-200/30 via-zinc-200/80 to-zinc-200/80 dark:bg-gradient-to-b dark:from-black/80 dark:via-black/80 dark:to-black/80 py-8 ">
      <div className="container max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="hover:bg-muted mb-6 rounded-full text-zinc-500"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-b from-primary to-orange-400 bg-clip-text text-transparent">
                  {quiz?.title}
                </h1>
              </div>
              {quiz?.description && (
                <p className="text-muted-foreground text-sm">{quiz.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                onClick={() => navigate(`/create-quiz?quizId=${id}`)}
                variant="outline"
                size="sm"
                className="rounded-lg text-sm"
              >
                <Edit className="h-4 w-4 mr-1.5" /> Edit Quiz
              </Button>

              {canShare && (
                <Button
                  onClick={() => setIsShareOpen(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-sm"
                >
                  <Share2 className="h-4 w-4 mr-1.5 text-primary" /> Share
                </Button>
              )}

              <Button
                onClick={startQuiz}
                disabled={loading}
                size="sm"
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold rounded-lg px-4"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Play className="h-4 w-4 mr-1.5" />
                )}
                Host Quiz
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Questions ({questions?.length || 0})</h2>
        </div>

        <div className="space-y-4">
          {sortedQuestions.map((question, index) => (
            <Card key={question._id} className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-md text-orange-400">Question {index + 1}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {question.time_limit}s
                </span>
              </div>
              <p className="mb-3 text-foreground text-sm font-medium">{question.question_text}</p>
              {question.question_image_url && (
                <img
                  src={question.question_image_url}
                  alt="Question"
                  className="w-full max-h-64 object-contain rounded-lg mb-3"
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
                {['A', 'B', 'C', 'D'].map(option => {
                  const optionText = (question as any)[`option_${option.toLowerCase()}`];
                  if (!optionText) return null;
                  return (
                    <div
                      key={option}
                      className={`p-2.5 rounded-lg border ${question.correct_answer === option
                        ? 'bg-emerald-500/10 border-emerald-500/50 font-semibold text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted/40 border-muted'
                        }`}
                    >
                      <span className="font-bold mr-2">{option}.</span>
                      {optionText}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Share Quiz Modal */}
      {id && (
        <ShareQuizModal
          quizId={id as Id<"quizzes">}
          quizTitle={quiz?.title}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
};

export default QuizDetails;