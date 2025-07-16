import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  Ticket, 
  CheckSquare, 
  Users, 
  FileText, 
  Book, 
  MessageSquare, 
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Receipt
} from 'lucide-react';

const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Tiketi', 
    href: '/tickets', 
    icon: Ticket 
  },
  { 
    name: 'Zadaci', 
    href: '/tasks', 
    icon: CheckSquare 
  },
  { 
    name: 'Korisnici', 
    href: '/users', 
    icon: Users 
  },
  { 
    name: 'Radnici', 
    href: '/workers', 
    icon: Building2 
  },
  { 
    name: 'Usluge', 
    href: '/services', 
    icon: Settings 
  },
  { 
    name: 'Fakture', 
    href: '/invoices', 
    icon: Receipt 
  },
  { 
    name: 'Wiki', 
    href: '/wiki', 
    icon: Book 
  },
  { 
    name: 'Chat', 
    href: '/chat', 
    icon: MessageSquare 
  },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">CRM Sistem</h1>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-sidebar-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-accent-foreground">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {profile?.role === 'admin' && 'Administrator'}
              {profile?.role === 'worker' && 'Radnik'}
              {profile?.role === 'client' && 'Klijent'}
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Odjavi se
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-sidebar-background">
          <SidebarContent />
        </div>
      </div>
      
      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-4 bg-sidebar-background">
          <h1 className="text-xl font-bold text-sidebar-foreground">CRM Sistem</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-sidebar-background">
            <SidebarContent />
          </div>
        )}
      </div>
    </>
  );
}