import React from 'react';
import { useLocation, Link } from 'wouter';
import { useCurrentUser, useLogout } from '@/lib/queries';
import { LayoutDashboard, Settings, Activity, Power, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  if (!currentUser) return <>{children}</>;

  const handleLogout = () => {
    logout.mutate();
  };

  const NavItem = ({ href, icon: Icon, label, exact = false }: { href: string, icon: any, label: string, exact?: boolean }) => {
    const isActive = exact ? location === href : location.startsWith(href);
    return (
      <Link href={href}>
        <Button 
          variant={isActive ? "secondary" : "ghost"} 
          className={`w-full justify-start gap-3 h-12 text-base font-medium ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
          onClick={() => setIsMobileOpen(false)}
          data-testid={`nav-${label.toLowerCase()}`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Button>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shrink-0">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-xl tracking-wide text-sidebar-foreground">DOWNTIME<span className="text-primary">.OS</span></span>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-2">
        <NavItem href="/" icon={LayoutDashboard} label="Dashboard" exact />
        <NavItem href="/processes" icon={Activity} label="Processes" />
        <NavItem href="/admin" icon={Settings} label="Administration" />
      </div>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="text-user-name">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout} 
            className="text-muted-foreground hover:text-destructive"
            data-testid="button-logout"
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 fixed inset-y-0 left-0 z-20">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-30 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-sidebar-foreground">DOWNTIME.OS</span>
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 border-r-sidebar-border bg-sidebar">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
