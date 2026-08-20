import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  SquareTerminal,
  Users,
  BookOpen,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import TeamSwitcher from "@/components/team-switcher";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const myQuizzes = useQuery(api.quizzes.getMyQuizzes);
  const sharedQuizzes = useQuery(api.sharing.getSharedQuizzes);
  const navigate = useNavigate();

  const myQuizItems =
    myQuizzes && myQuizzes.length > 0
      ? myQuizzes.map((q: any) => ({ title: q.title || "Untitled", url: `/quiz/${String(q._id)}` }))
      : [];

  const sharedQuizItems =
    sharedQuizzes && sharedQuizzes.length > 0
      ? sharedQuizzes.map((q: any) => ({ title: q.title, url: `/quiz/${String(q._id)}` }))
      : [];

  const navMain = [
    {
      title: "My Quizzes",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
      items: myQuizItems,
    },
    ...(sharedQuizItems.length > 0
      ? [
        {
          title: "Shared with me",
          url: "/dashboard?tab=shared",
          icon: Users,
          isActive: true,
          items: sharedQuizItems,
        },
      ]
      : []),
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  onClick={() => navigate("/my-attempts")}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>My Attempts</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
