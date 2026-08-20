import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Plus, Trash2, MoreVertical, Edit, Play, Clock, Share2, Users, UserCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ShareQuizModal } from "@/components/ShareQuizModal";
import { Id } from "../../convex/_generated/dataModel";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "shared" ? "shared" : "my-quizzes";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { toast } = useToast();

  // Share Modal state
  const [shareQuizId, setShareQuizId] = useState<Id<"quizzes"> | null>(null);
  const [shareQuizTitle, setShareQuizTitle] = useState<string>("");
  const [isShareOpen, setIsShareOpen] = useState(false);

  const myQuizzes = useQuery(api.quizzes.getMyQuizzes);
  const sharedQuizzes = useQuery(api.sharing.getSharedQuizzes);
  const deleteQuiz = useMutation(api.quizzes.deleteQuiz);

  const openShareModal = (quizId: Id<"quizzes">, title: string) => {
    setShareQuizId(quizId);
    setShareQuizTitle(title);
    setIsShareOpen(true);
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === "shared") {
      setSearchParams({ tab: "shared" });
    } else {
      setSearchParams({});
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border/40 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="bg-muted/20 min-h-[calc(100vh-6rem)] flex-1 rounded-xl p-4 md:p-8 border border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Quiz Collection</h2>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => navigate('/join')}
                  className="rounded-full px-5 dark:text-zinc-300"
                >
                  Join Quiz
                </Button>
                <Button
                  onClick={() => navigate('/create-quiz')}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:brightness-95 rounded-full px-5 py-2 font-medium shadow-md"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Create Quiz
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-muted/60">
                <TabsTrigger value="my-quizzes" className="text-sm font-semibold">
                  My Quizzes ({myQuizzes?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="shared" className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Shared with me ({sharedQuizzes?.length ?? 0})
                </TabsTrigger>
              </TabsList>

              {/* MY QUIZZES TAB */}
              <TabsContent value="my-quizzes" className="space-y-4">
                <div className="hidden md:flex justify-between px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <p className="w-1/3">Quiz Details</p>
                  <p className="w-1/3 text-center">Created</p>
                  <p className="w-1/3 text-right">Actions</p>
                </div>

                {myQuizzes === undefined ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Loading quizzes...
                  </div>
                ) : myQuizzes.length === 0 ? (
                  <Card className="p-12 text-center border-dashed border-2">
                    <p className="text-muted-foreground mb-4">You haven't created any quizzes yet.</p>
                    <Button onClick={() => navigate('/create-quiz')} className="rounded-full">
                      <Plus className="h-4 w-4 mr-2" /> Create Your First Quiz
                    </Button>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myQuizzes.map((q: any) => (
                      <Card key={String(q._id)} className="p-4 hover:border-primary/50 transition-all shadow-sm">
                        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_1fr] gap-4 items-center">
                          {/* Details Column */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base md:text-lg font-bold truncate text-foreground">{q.title}</h3>
                            </div>
                            {q.description && (
                              <p className="text-xs md:text-sm text-muted-foreground truncate">
                                {q.description}
                              </p>
                            )}
                          </div>

                          {/* Created Column */}
                          <div className="hidden md:flex flex-row items-center justify-center text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 mr-1 shrink-0" />
                            <span>{formatDistanceToNow(new Date(q._creationTime))} ago</span>
                          </div>

                          {/* Actions Column */}
                          <div className="flex justify-end items-center gap-2">

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="h-5 w-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onSelect={() => navigate(`/create-quiz?quizId=${String(q._id)}`)}>
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => navigate(`/quiz/${String(q._id)}`)}>
                                  <Play className="h-4 w-4 mr-2" /> Host
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openShareModal(q._id, q.title)}>
                                  <Share2 className="h-4 w-4 mr-2" /> Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={async () => {
                                    if (!confirm(`Delete quiz "${q.title}"? This will also remove access for all hosts.`)) return;
                                    try {
                                      await deleteQuiz({ id: q._id });
                                      toast({ title: "Deleted", description: "Quiz deleted successfully." });
                                    } catch (err: any) {
                                      toast({ title: "Error", description: `Failed to delete quiz: ${err.message}`, variant: "destructive" });
                                    }
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* SHARED WITH ME TAB */}
              <TabsContent value="shared" className="space-y-4">
                <div className="hidden md:flex justify-between px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <p className="w-1/3">Quiz Details</p>
                  <p className="w-1/3 text-center">Owner & Access</p>
                  <p className="w-1/3 text-right">Actions</p>
                </div>

                {sharedQuizzes === undefined ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Loading shared quizzes...
                  </div>
                ) : sharedQuizzes.length === 0 ? (
                  <Card className="p-12 text-center border-dashed border-2">
                    <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="font-bold text-base mb-1">No shared quizzes yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      When a quiz creator invites you as a host, quizzes shared with you will appear here with full co-editing and hosting access.
                    </p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {sharedQuizzes.map((q: any) => (
                      <Card key={String(q._id)} className="p-4 hover:border-primary/50 transition-all shadow-sm">
                        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_1fr] gap-4 items-center">
                          {/* Details Column */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base md:text-lg font-bold truncate text-foreground">{q.title}</h3>
                            </div>
                            {q.description && (
                              <p className="text-xs md:text-sm text-muted-foreground truncate">
                                {q.description}
                              </p>
                            )}
                          </div>

                          {/* Owner Column */}
                          <div className="hidden md:flex flex-col items-center justify-center text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <UserCheck className="h-3.5 w-3.5 text-primary" /> Shared by {q.ownerName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Role: Host
                            </span>
                          </div>

                          {/* Actions Column */}
                          <div className="flex justify-end items-center gap-2">

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="h-5 w-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onSelect={() => navigate(`/create-quiz?quizId=${String(q._id)}`)}>
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => navigate(`/quiz/${String(q._id)}`)}>
                                  <Play className="h-4 w-4 mr-2" /> Host
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>

      {/* Share Quiz Modal for Owners */}
      <ShareQuizModal
        quizId={shareQuizId}
        quizTitle={shareQuizTitle}
        isOpen={isShareOpen}
        onClose={() => {
          setIsShareOpen(false);
          setShareQuizId(null);
        }}
      />
    </SidebarProvider>
  );
}
