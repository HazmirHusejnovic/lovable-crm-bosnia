
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatsCard from './StatsCard';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  Ticket,
  TrendingUp,
  Activity,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalTasks: number;
  completedTasks: number;
  totalTickets: number;
  openTickets: number;
  totalInvoices: number;
  paidInvoices: number;
  totalRevenue: number;
  overdueInvoices: number;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalTickets: 0,
    openTickets: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    totalRevenue: 0,
    overdueInvoices: 0
  });
  
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [taskStatusData, setTaskStatusData] = useState<ChartData[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<ChartData[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [currentCurrency, setCurrentCurrency] = useState('BAM');
  
  const { profile } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    loadCurrency();
  }, []);

  const loadCurrency = () => {
    const savedSettings = localStorage.getItem('invoice_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setCurrentCurrency(settings.default_currency || 'BAM');
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch users
      const { data: users } = await supabase
        .from('profiles')
        .select('*');

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*');

      // Fetch tickets  
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*');

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*');

      const totalUsers = users?.length || 0;
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
      const totalInvoices = invoices?.length || 0;
      const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0;
      const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      const overdueInvoices = invoices?.filter(i => i.due_date && new Date(i.due_date) < new Date() && i.status !== 'paid').length || 0;

      setStats({
        totalUsers,
        totalTasks,
        completedTasks,
        totalTickets,
        openTickets,
        totalInvoices,
        paidInvoices,
        totalRevenue,
        overdueInvoices
      });

      // Prepare chart data
      const taskStatuses = [
        { name: 'Na čekanju', value: tasks?.filter(t => t.status === 'pending').length || 0, color: '#fbbf24' },
        { name: 'U toku', value: tasks?.filter(t => t.status === 'in_progress').length || 0, color: '#3b82f6' },
        { name: 'Završeno', value: completedTasks, color: '#10b981' },
        { name: 'Otkazano', value: tasks?.filter(t => t.status === 'cancelled').length || 0, color: '#ef4444' }
      ];

      const invoiceStatuses = [
        { name: 'Nacrt', value: invoices?.filter(i => i.status === 'draft').length || 0, color: '#6b7280' },
        { name: 'Poslata', value: invoices?.filter(i => i.status === 'sent').length || 0, color: '#3b82f6' },
        { name: 'Plaćena', value: paidInvoices, color: '#10b981' },
        { name: 'Otkazana', value: invoices?.filter(i => i.status === 'cancelled').length || 0, color: '#ef4444' }
      ];

      // Monthly revenue data (last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthRevenue = invoices?.filter(inv => 
          inv.status === 'paid' && 
          inv.paid_at &&
          new Date(inv.paid_at) >= monthStart && 
          new Date(inv.paid_at) <= monthEnd
        ).reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

        monthlyRevenue.push({
          name: date.toLocaleDateString('bs-BA', { month: 'short' }),
          value: monthRevenue
        });
      }

      setTaskStatusData(taskStatuses);
      setInvoiceStatusData(invoiceStatuses);
      setMonthlyData(monthlyRevenue);

      // Recent activities
      const activities = [];
      
      // Recent tasks
      if (tasks) {
        tasks.slice(0, 3).forEach(task => {
          activities.push({
            type: 'task',
            title: `Zadatak: ${task.title}`,
            status: task.status,
            time: task.created_at,
            icon: CheckCircle
          });
        });
      }
      
      // Recent invoices
      if (invoices) {
        invoices.slice(0, 3).forEach(invoice => {
          activities.push({
            type: 'invoice',
            title: `Faktura: ${invoice.invoice_number}`,
            status: invoice.status,
            time: invoice.created_at,
            icon: FileText
          });
        });
      }

      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivities(activities.slice(0, 6));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>Poslednje ažurirao: {new Date().toLocaleString('bs-BA')}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ukupno korisnika"
          value={stats.totalUsers}
          icon={Users}
          trend={stats.totalUsers > 0 ? 'up' : 'neutral'}
          description="Registrovanih korisnika"
        />
        <StatsCard
          title="Aktivni zadaci"
          value={stats.totalTasks - stats.completedTasks}
          icon={CheckCircle}
          trend={stats.completedTasks > (stats.totalTasks / 2) ? 'up' : 'down'}
          description={`${stats.completedTasks}/${stats.totalTasks} završeno`}
        />
        <StatsCard
          title="Otvoreni tiketi"
          value={stats.openTickets}
          icon={Ticket}
          trend={stats.openTickets > 5 ? 'down' : 'up'}
          description={`${stats.totalTickets} ukupno`}
        />
        <StatsCard
          title="Ukupni prihod"
          value={`${stats.totalRevenue.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} ${currentCurrency}`}
          icon={DollarSign}
          trend="up"
          description={`${stats.paidInvoices}/${stats.totalInvoices} plaćeno`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Mjesečni prihod
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString('bs-BA', { minimumFractionDigits: 2 })} ${currentCurrency}`, 'Prihod']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Status zadataka
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Invoice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Status faktura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoiceStatusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Nedavne aktivnosti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                  <activity.icon className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.time).toLocaleDateString('bs-BA')}
                    </p>
                  </div>
                  <Badge variant={
                    activity.status === 'completed' || activity.status === 'paid' ? 'default' :
                    activity.status === 'in_progress' || activity.status === 'sent' ? 'secondary' :
                    'outline'
                  }>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {stats.overdueInvoices > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                Imate {stats.overdueInvoices} faktura(a) kojima je prošao rok za naplatu
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
