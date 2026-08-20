import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Copy, CheckCircle, UserX, Loader2, ShieldCheck, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShareQuizModalProps {
  quizId: Id<"quizzes"> | null;
  quizTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareQuizModal({ quizId, quizTitle, isOpen, onClose }: ShareQuizModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const createInviteMutation = useMutation(api.sharing.createQuizInvite);
  const revokeHostMutation = useMutation(api.sharing.revokeHostAccess);
  const hosts = useQuery(
    api.sharing.getQuizHosts,
    quizId && isOpen ? { quizId } : "skip"
  );

  useEffect(() => {
    if (quizId && isOpen && !inviteToken) {
      handleGenerateInvite();
    }
  }, [quizId, isOpen]);

  const handleGenerateInvite = async () => {
    if (!quizId) return;
    setIsGenerating(true);
    try {
      const res = await createInviteMutation({ quizId });
      setInviteToken(res.token);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to generate invite link.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const inviteUrl = inviteToken
    ? `${window.location.origin}/quiz/invite/${inviteToken}`
    : "";

  const copyToClipboard = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({
      title: "Link Copied!",
      description: "Invite link copied to clipboard. Share it with intended hosts.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevoke = async (hostUserId: string, hostName: string) => {
    if (!quizId) return;
    if (!confirm(`Are you sure you want to revoke host access for ${hostName}?`)) return;

    try {
      await revokeHostMutation({ quizId, hostUserId });
      toast({
        title: "Access Revoked",
        description: `Revoked host access for ${hostName}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to revoke access.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Share Quiz — Host Access
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Invite co-hosts to edit and host <span className="font-semibold text-foreground">{quizTitle || "this quiz"}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Invite Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" /> Invite Link
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={isGenerating ? "Generating link..." : inviteUrl}
                placeholder="Generating invite link..."
                className="font-mono text-xs bg-muted/50 border-muted"
              />
              <Button
                type="button"
                onClick={copyToClipboard}
                disabled={!inviteToken || isGenerating}
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" /> Copy Link
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Anyone with this link can view details and accept host access to this quiz.
            </p>
          </div>

          {/* Current Hosts Section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Current Hosts</h4>
              <Badge variant="outline" className="text-xs font-normal">
                {hosts ? hosts.length : 0} {hosts?.length === 1 ? "host" : "hosts"}
              </Badge>
            </div>

            {hosts === undefined ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading hosts...
              </div>
            ) : hosts.length === 0 ? (
              <div className="text-center py-6 bg-muted/20 rounded-lg border border-dashed border-muted text-muted-foreground text-xs">
                No active hosts for this quiz yet. Share the link above to invite someone!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {hosts.map((host) => (
                  <div
                    key={host.accessId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-muted/60 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {host.imageUrl ? (
                        <img
                          src={host.imageUrl}
                          alt={host.name}
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {host.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{host.name}</p>
                        {host.email && (
                          <p className="text-xs text-muted-foreground truncate">{host.email}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(host.userId, host.name)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs shrink-0 h-8 px-2.5"
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" /> Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
