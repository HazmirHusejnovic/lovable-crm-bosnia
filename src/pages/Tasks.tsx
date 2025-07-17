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
import { Plus, Search, Clock, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  due_date: string;
  estimated_hours: number;
  hours_worked: number;
  is_billable: boolean;
  client_id: string;
  assigned_worker_id: string;
  service_id: string;
  created_at: string;
  client?: { first_name: string; last_name: string };
  assigned_worker?: { first_name: string; last_name: string };
  service?: { name: string };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Service {
  id: string;
  name: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
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
    progress: 0,
    due_date: '',
    estimated_hours: 0,
    is_billable: false,
    client_id: '',
    assigned_worker_id: '',
    service_id: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    fetchServices();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          client:profiles!tasks_client_id_fkey(first_name, last_name),
          assigned_worker:profiles!tasks_assigned_worker_id_fkey(first_name, last_name),
          service:services(name)
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
        .select('id, first_name, last_name, role')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(formData)
          .eq('id', editingTask.id);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Zadatak je uspešno ažuriran' });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([formData]);
        
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
      progress: 0,
      due_date: '',
      estimated_hours: 0,
      is_billable: false,
      client_id: '',
      assigned_worker_id: '',
      service_id: ''
    });
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      progress: task.progress || 0,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      estimated_hours: task.estimated_hours || 0,
      is_billable: task.is_billable || false,
      client_id: task.client_id || '',
      assigned_worker_id: task.assigned_worker_id || '',
      service_id: task.service_id || ''
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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const clients = profiles.filter(p => p.role === 'client');
  const workers = profiles.filter(p => ['admin', 'worker'].includes(p.role));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Zadaci</h1>
        {(profile?.role === 'admin' || profile?.role === 'worker') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novi zadatak
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Krajnji rok</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Procenjeni sati</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({...formData, estimated_hours: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Klijent</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Izaberi klijenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Radnik</Label>
                    <Select value={formData.assigned_worker_id} onValueChange={(value) => setFormData({...formData, assigned_worker_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Izaberi radnika" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map(worker => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.first_name} {worker.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Usluga</Label>
                  <Select value={formData.service_id} onValueChange={(value) => setFormData({...formData, service_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberi uslugu" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_billable"
                    checked={formData.is_billable}
                    onChange={(e) => setFormData({...formData, is_billable: e.target.checked})}
                  />
                  <Label htmlFor="is_billable">Naplatljivo</Label>
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
          <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(task)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <Badge className={getStatusColor(task.status)}>
                  {task.status === 'pending' && 'Na čekanju'}
                  {task.status === 'in_progress' && 'U toku'}
                  {task.status === 'completed' && 'Završeno'}
                  {task.status === 'cancelled' && 'Otkazano'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {task.description && (
                <p className="text-muted-foreground mb-3">{task.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {task.client && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{task.client.first_name} {task.client.last_name}</span>
                  </div>
                )}
                {task.assigned_worker && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Radnik: {task.assigned_worker.first_name} {task.assigned_worker.last_name}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(task.due_date).toLocaleDateString('sr-RS')}</span>
                  </div>
                )}
                {task.estimated_hours > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{task.estimated_hours}h / {task.hours_worked}h</span>
                  </div>
                )}
                {task.service?.name && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {task.service.name}
                  </span>
                )}
                {task.is_billable && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Naplatljivo
                  </span>
                )}
              </div>
              {task.progress > 0 && (
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