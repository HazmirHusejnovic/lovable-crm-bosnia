import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from './StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Ticket, 
  CheckSquare, 
  Users, 
  Receipt, 
  Building2, 
  Book, 
  MessageSquare, 
  Settings,
  Plus,
  TrendingUp,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  totalTasks: number;
  pendingTasks: number;
  totalUsers: number;
  totalWorkers: number;
  totalInvoices: number;
  unpaidInvoices: number;
  totalServices: number;
  totalWikiArticles: number;
  totalChatMessages: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    totalTasks: 0,
    pendingTasks: 0,
    totalUsers: 0,
    totalWorkers: 0,
    totalInvoices: 0,
    unpaidInvoices: 0,
    totalServices: 0,
    totalWikiArticles: 0,
    totalChatMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        ticketsResponse,
        tasksResponse,
        usersResponse,
        workersResponse,
        invoicesResponse,
        servicesResponse,
        wikiResponse,
        chatResponse
      ] = await Promise.all([
        supabase.from('tickets').select('id, status'),
        supabase.from('tasks').select('id, status'),
        supabase.from('profiles').select('id, role').eq('role', 'client'),
        supabase.from('profiles').select('id, role').in('role', ['admin', 'worker']),
        supabase.from('invoices').select('id, status'),
        supabase.from('services').select('id').eq('is_active', true),
        supabase.from('wiki_articles').select('id').eq('is_published', true),
        supabase.from('chat_messages').select('id')
      ]);

      const tickets = ticketsResponse.data || [];
      const tasks = tasksResponse.data || [];
      const users = usersResponse.data || [];
      const workers = workersResponse.data || [];
      const invoices = invoicesResponse.data || [];
      const services = servicesResponse.data || [];
      const wiki = wikiResponse.data || [];
      const chat = chatResponse.data || [];

      setStats({
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        totalTasks: tasks.length,
        pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
        totalUsers: users.length,
        totalWorkers: workers.length,
        totalInvoices: invoices.length,
        unpaidInvoices: invoices.filter(i => i.status === 'sent' || i.status === 'draft').length,
        totalServices: services.length,
        totalWikiArticles: wiki.length,
        totalChatMessages: chat.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Greška',
        description: 'Nije moguće učitati statistike.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Novi tiket',
      description: 'Kreiraj novi tiket',
      icon: <Plus className="h-4 w-4" />,
      action: () => navigate('/tickets/new')
    },
    {
      title: 'Novi zadatak',
      description: 'Kreiraj novi zadatak',
      icon: <Plus className="h-4 w-4" />,
      action: () => navigate('/tasks/new')
    },
    {
      title: 'Nova faktura',
      description: 'Kreiraj novu fakturu',
      icon: <Plus className="h-4 w-4" />,
      action: () => navigate('/invoices/new')
    },
    {
      title: 'Novi korisnik',
      description: 'Dodaj novog korisnika',
      icon: <Plus className="h-4 w-4" />,
      action: () => navigate('/users/new')
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Dobrodošli, {profile?.first_name}! Evo pregleda vašeg CRM sistema.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Dobrodošli, {profile?.first_name}! Evo pregleda vašeg CRM sistema.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Osvježi
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tiketi"
          value={stats.totalTickets}
          icon={<Ticket className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.openTickets} aktivnih`}
          onClick={() => navigate('/tickets')}
        />
        <StatsCard
          title="Zadaci"
          value={stats.totalTasks}
          icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.pendingTasks} u toku`}
          onClick={() => navigate('/tasks')}
        />
        <StatsCard
          title="Korisnici"
          value={stats.totalUsers}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Ukupno klijenata"
          onClick={() => navigate('/users')}
        />
        <StatsCard
          title="Radnici"
          value={stats.totalWorkers}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          description="Aktivni radnici"
          onClick={() => navigate('/workers')}
        />
        <StatsCard
          title="Fakture"
          value={stats.totalInvoices}
          icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.unpaidInvoices} neplaćenih`}
          onClick={() => navigate('/invoices')}
        />
        <StatsCard
          title="Usluge"
          value={stats.totalServices}
          icon={<Settings className="h-4 w-4 text-muted-foreground" />}
          description="Aktivne usluge"
          onClick={() => navigate('/services')}
        />
        <StatsCard
          title="Wiki"
          value={stats.totalWikiArticles}
          icon={<Book className="h-4 w-4 text-muted-foreground" />}
          description="Objavljeni članci"
          onClick={() => navigate('/wiki')}
        />
        <StatsCard
          title="Poruke"
          value={stats.totalChatMessages}
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          description="Ukupno poruka"
          onClick={() => navigate('/chat')}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Card 
            key={action.title} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={action.action}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
              {action.icon}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {action.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Nedavna aktivnost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">Sistem je spreman za rad</p>
              <span className="text-xs text-muted-foreground">Sada</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">CRM baza podataka je uspješno kreirana</p>
              <span className="text-xs text-muted-foreground">Danas</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">Korisnik {profile?.first_name} {profile?.last_name} je prijavljen</p>
              <span className="text-xs text-muted-foreground">Danas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}