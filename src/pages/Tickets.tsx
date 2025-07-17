import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Filter, Eye, Edit, Clock, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  assigned_worker_id: string;
  estimated_hours: number;
  hours_worked: number;
  is_billable: boolean;
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_worker: {
    first_name: string;
    last_name: string;
  };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'worker' | 'client';
}

export default function Tickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as const,
    client_id: '',
    assigned_worker_id: '',
    estimated_hours: '',
    is_billable: false
  });

  useEffect(() => {
    fetchTickets();
    fetchProfiles();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          client:profiles!tickets_client_id_fkey(first_name, last_name, email),
          assigned_worker:profiles!tickets_assigned_worker_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tickets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('is_active', true);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const createTicket = async () => {
    try {
      // Generate ticket number
      const { data: ticketNumberData, error: ticketNumberError } = await supabase
        .rpc('generate_ticket_number');
      
      if (ticketNumberError) throw ticketNumberError;
      
      const { data, error } = await supabase
        .from('tickets')
        .insert([{
          ticket_number: ticketNumberData,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          client_id: formData.client_id,
          assigned_worker_id: formData.assigned_worker_id || null,
          estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : null,
          is_billable: formData.is_billable
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ticket created successfully'
      });

      setShowCreateDialog(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        client_id: '',
        assigned_worker_id: '',
        estimated_hours: '',
        is_billable: false
      });
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket',
        variant: 'destructive'
      });
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus as 'open' | 'in_progress' | 'closed',
          closed_at: newStatus === 'closed' ? new Date().toISOString() : null
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ticket status updated'
      });

      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive'
      });
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'closed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const clients = profiles.filter(p => p.role === 'client');
  const workers = profiles.filter(p => p.role === 'worker' || p.role === 'admin');

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-muted-foreground mt-2">Manage support tickets and issues</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="Bug, Feature Request, Support"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detailed description of the issue"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_hours">Estimated Hours</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
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
                <div className="space-y-2">
                  <Label htmlFor="assigned_worker">Assigned Worker</Label>
                  <Select value={formData.assigned_worker_id} onValueChange={(value) => setFormData({...formData, assigned_worker_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker" />
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

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_billable"
                  checked={formData.is_billable}
                  onChange={(e) => setFormData({...formData, is_billable: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_billable">Billable</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createTicket}>Create Ticket</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {ticket.ticket_number}
                    </Badge>
                    <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">{ticket.title}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {ticket.description && (
                    <p className="line-clamp-2 mb-2">{ticket.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{ticket.client?.first_name} {ticket.client?.last_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(ticket.created_at), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
              ? 'No tickets match your current filters.'
              : 'Create your first ticket to get started.'
            }
          </p>
        </div>
      )}

      {/* Ticket Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Ticket Number</Label>
                  <p className="text-sm text-muted-foreground">{selectedTicket.ticket_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={`text-xs ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="text-sm text-muted-foreground">{selectedTicket.title}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge className={`text-xs ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm text-muted-foreground">{selectedTicket.category}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Client</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket.client?.first_name} {selectedTicket.client?.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Assigned Worker</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket.assigned_worker?.first_name} {selectedTicket.assigned_worker?.last_name}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Estimated Hours</Label>
                  <p className="text-sm text-muted-foreground">{selectedTicket.estimated_hours || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Hours Worked</Label>
                  <p className="text-sm text-muted-foreground">{selectedTicket.hours_worked || 0}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Updated</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedTicket.updated_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTicket.is_billable}
                  readOnly
                  className="rounded border-gray-300"
                />
                <Label className="text-sm font-medium">Billable</Label>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}