
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, Calendar, User, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assigned_worker_id?: string;
  client_id?: string;
  estimated_hours?: number;
  hours_worked?: number;
  progress?: number;
  is_billable?: boolean;
  created_at: string;
  assigned_worker?: { first_name: string; last_name: string };
  client?: { first_name: string; last_name: string; company?: string };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  company?: string;
  role: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
    assigned_worker_id: '',
    client_id: '',
    estimated_hours: 0,
    progress: 0,
    is_billable: false
  });

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    fetchClients();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_worker:profiles!tasks_assigned_worker_id_fkey(first_name, last_name),
          client:profiles!tasks_client_id_fkey(first_name, last_name, company)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({ title: 'Greška', description: 'Neuspešno učitavanje zadataka', variant: 'destructive' });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company, role')
        .in('role', ['admin', 'worker'])
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company, role')
        .eq('role', 'client')
        .order('first_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assigned_worker_id: formData.assigned_worker_id || null,
        client_id: formData.client_id || null,
        estimated_hours: formData.estimated_hours || null,
        progress: formData.progress,
        is_billable: formData.is_billable
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Zadatak je uspešno ažuriran' });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Zadatak je uspešno kreiran' });
      }
      
      fetchTasks();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({ title: 'Greška', description: 'Neuspešno čuvanje zadatka', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      due_date: '',
      assigned_worker_id: '',
      client_id: '',
      estimated_hours: 0,
      progress: 0,
      is_billable: false
    });
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      assigned_worker_id: task.assigned_worker_id || '',
      client_id: task.client_id || '',
      estimated_hours: task.estimated_hours || 0,
      progress: task.progress || 0,
      is_billable: task.is_billable || false
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Na čekanju',
      in_progress: 'U toku',
      completed: 'Završeno',
      cancelled: 'Otkazano'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: 'Nizak',
      medium: 'Srednji',
      high: 'Visok',
      urgent: 'Hitan'
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_worker?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_worker?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Only admins and workers can manage tasks
  const canManage = profile?.role === 'admin' || profile?.role === 'worker';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Zadaci</h1>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novi zadatak
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Uredi zadatak' : 'Novi zadatak'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Naslov</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Opis</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Na čekanju</SelectItem>
                        <SelectItem value="in_progress">U toku</SelectItem>
                        <SelectItem value="completed">Završeno</SelectItem>
                        <SelectItem value="cancelled">Otkazano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioritet</Label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData({...formData, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Nizak</SelectItem>
                        <SelectItem value="medium">Srednji</SelectItem>
                        <SelectItem value="high">Visok</SelectItem>
                        <SelectItem value="urgent">Hitan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dodijeli radniku</Label>
                    <Select value={formData.assigned_worker_id} onValueChange={(value) => setFormData({...formData, assigned_worker_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Izaberi radnika" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map(worker => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.first_name} {worker.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Klijent</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Izaberi klijenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} {client.company && `(${client.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Datum dospeća</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Procijenjeni sati</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({...formData, estimated_hours: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Napredak (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({...formData, progress: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_billable"
                    checked={formData.is_billable}
                    onChange={(e) => setFormData({...formData, is_billable: e.target.checked})}
                  />
                  <Label htmlFor="is_billable">Naplativ zadatak</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingTask ? 'Ažuriraj' : 'Kreiraj'}</Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Otkaži
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pretraži zadatke..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi statusi</SelectItem>
            <SelectItem value="pending">Na čekanju</SelectItem>
            <SelectItem value="in_progress">U toku</SelectItem>
            <SelectItem value="completed">Završeno</SelectItem>
            <SelectItem value="cancelled">Otkazano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={`cursor-pointer hover:shadow-md transition-shadow ${canManage ? '' : 'pointer-events-none'}`} onClick={() => canManage && handleEdit(task)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(task.status)}>
                    {getStatusLabel(task.status)}
                  </Badge>
                  {task.priority && (
                    <Badge className={getPriorityColor(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex gap-6 text-sm text-muted-foreground">
                  {task.assigned_worker && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{task.assigned_worker.first_name} {task.assigned_worker.last_name}</span>
                    </div>
                  )}
                  {task.client && (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{task.client.first_name} {task.client.last_name}</span>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Dospeće: {new Date(task.due_date).toLocaleDateString('bs-BA')}</span>
                    </div>
                  )}
                  {task.estimated_hours && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{task.estimated_hours}h</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(task.created_at).toLocaleDateString('bs-BA')}
                </div>
              </div>
              {task.progress !== undefined && task.progress > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Napredak</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredTasks.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Nema zadataka za prikaz</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
