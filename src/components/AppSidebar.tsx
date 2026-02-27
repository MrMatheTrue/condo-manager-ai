import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Bot, Bell, Settings, LogOut, CheckSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sindicoNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Assistente IA", url: "/ia", icon: Bot },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
];

const colaboradorNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
];

export function AppSidebar() {
  const { signOut, isColaborador, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = isColaborador ? colaboradorNav : sindicoNav;

  // Fetch unread notification count
  const { data: unreadCount } = useQuery({
    queryKey: ["notif-unread", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notificacoes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("lida", false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30_000, // poll every 30s
  });

  return (
    <Sidebar>
      <div className="p-4 flex items-center gap-2.5 border-b">
        <CheckSquare className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold tracking-tight">SíndicoOS</span>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <div className="relative">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.url === "/notificacoes" && unreadCount && unreadCount > 0 ? (
                          <span className="absolute -top-1.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive flex items-center justify-center text-[9px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {!isColaborador && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/configuracoes" className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleSignOut} className="hover:bg-sidebar-accent cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
