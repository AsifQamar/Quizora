import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ShieldCheck, Loader2, ArrowLeft, UserCheck, AlertCircle } from "lucide-react";

export default function InviteAcceptance() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [accepting, setAccepting] = useState(false);

  const inviteData = useQuery(
    api.sharing.getInviteByToken,
    token ? { token } : "skip"
  );
  const acceptMutation = useMutation(api.sharing.acceptQuizInvite);

  const handleSignIn = () => {
    openSignIn({
      afterSignInUrl: window.location.href,
      afterSignUpUrl: window.location.href,
    });
  };

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const quizId = await acceptMutation({ token });
      toast({
        title: "Invite Accepted!",
        description: "You now have Host access to this quiz.",
      });
      navigate(`/dashboard?tab=shared`);
    } catch (err: any) {
      toast({
        title: "Failed to accept invite",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (!isLoaded || inviteData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!inviteData.valid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-6 text-center shadow-lg border-destructive/30">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">Invalid or Expired Invitation</h2>
          <p className="text-sm text-muted-foreground mb-6">{inviteData.reason}</p>
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-muted/20 to-background">
      <Card className="max-w-lg w-full shadow-2xl border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-xs uppercase font-bold tracking-wider opacity-90">Host Invitation</span>
          </div>
          <h1 className="text-2xl font-extrabold truncate">{inviteData.quizTitle}</h1>
          {inviteData.quizDescription && (
            <p className="text-sm opacity-90 mt-1 line-clamp-2">{inviteData.quizDescription}</p>
          )}
        </div>

        <CardHeader className="pt-6 pb-2">
          <CardTitle className="text-base text-muted-foreground font-normal">
            You've been invited to host this quiz by <span className="font-semibold text-foreground">{inviteData.ownerName}</span>.
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 py-2">
          {!isSignedIn ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
              <p className="font-medium">Sign in required</p>
              <p className="text-xs opacity-90 mt-1">Please sign in to accept this invitation and access the quiz.</p>
            </div>
          ) : (
            <div className="space-y-3">

              {inviteData.isOwner && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span>You are the owner of this quiz and already have full access.</span>
                </div>
              )}

              {inviteData.hasAccess && !inviteData.isOwner && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span>You already have Host access to this quiz.</span>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-4 pb-6 flex flex-col gap-3">
          {!isSignedIn ? (
            <Button onClick={handleSignIn} size="lg" className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
              Sign In to Continue
            </Button>
          ) : inviteData.isOwner ? (
            <Button onClick={() => navigate("/dashboard")} size="lg" className="w-full">
              Go to Dashboard
            </Button>
          ) : inviteData.hasAccess ? (
            <Button onClick={() => navigate(`/quiz/${inviteData.quizId}`)} size="lg" className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
              View Shared Quiz
            </Button>
          ) : (
            <Button
              onClick={handleAccept}
              disabled={accepting}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:opacity-90"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Accepting...
                </>
              ) : (
                "Accept Invite"
              )}
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-xs text-muted-foreground">
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
