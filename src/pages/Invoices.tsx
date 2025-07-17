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
import { Plus, Search, Calendar, User, DollarSign, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  client?: { first_name: string; last_name: string; company?: string };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  company?: string;
  role: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    client_id: '',
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
    subtotal: 0,
    tax_rate: 17.00,
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchProfiles();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:profiles!invoices_client_id_fkey(first_name, last_name, company)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({ title: 'Greška', description: 'Neuspešno učitavanje faktura', variant: 'destructive' });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company, role')
        .eq('role', 'client')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const taxAmount = (formData.subtotal * formData.tax_rate) / 100;
      const totalAmount = formData.subtotal + taxAmount;
      
      const invoiceData = {
        ...formData,
        tax_amount: taxAmount,
        total_amount: totalAmount
      };

      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Faktura je uspešno ažurirana' });
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert([invoiceData]);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Faktura je uspešno kreirana' });
      }
      
      fetchInvoices();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({ title: 'Greška', description: 'Neuspešno čuvanje fakture', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      status: 'draft',
      subtotal: 0,
      tax_rate: 17.00,
      due_date: '',
      notes: ''
    });
    setEditingInvoice(null);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      client_id: invoice.client_id,
      status: invoice.status,
      subtotal: invoice.subtotal || 0,
      tax_rate: invoice.tax_rate || 17.00,
      due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
      notes: invoice.notes || ''
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'Nacrt',
      sent: 'Poslata',
      paid: 'Plaćena',
      overdue: 'Dospeće prošlo',
      cancelled: 'Otkazana'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fakture</h1>
        {profile?.role === 'admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova faktura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingInvoice ? 'Uredi fakturu' : 'Nova faktura'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Klijent</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberi klijenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name} {client.company && `(${client.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Nacrt</SelectItem>
                        <SelectItem value="sent">Poslata</SelectItem>
                        <SelectItem value="paid">Plaćena</SelectItem>
                        <SelectItem value="overdue">Dospeće prošlo</SelectItem>
                        <SelectItem value="cancelled">Otkazana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Datum dospeća</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Osnovica (RSD)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({...formData, subtotal: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Stopa PDV-a (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Napomene</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Osnovica:</span>
                      <span>{formData.subtotal.toLocaleString('sr-RS')} RSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PDV ({formData.tax_rate}%):</span>
                      <span>{((formData.subtotal * formData.tax_rate) / 100).toLocaleString('sr-RS')} RSD</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Ukupno:</span>
                      <span>{(formData.subtotal + (formData.subtotal * formData.tax_rate) / 100).toLocaleString('sr-RS')} RSD</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingInvoice ? 'Ažuriraj' : 'Kreiraj'}</Button>
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
            placeholder="Pretraži fakture..."
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
            <SelectItem value="draft">Nacrt</SelectItem>
            <SelectItem value="sent">Poslata</SelectItem>
            <SelectItem value="paid">Plaćena</SelectItem>
            <SelectItem value="overdue">Dospeće prošlo</SelectItem>
            <SelectItem value="cancelled">Otkazana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className={`cursor-pointer hover:shadow-md transition-shadow ${profile?.role === 'admin' ? '' : 'pointer-events-none'}`} onClick={() => profile?.role === 'admin' && handleEdit(invoice)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                    {invoice.client && (
                      <p className="text-sm text-muted-foreground">
                        {invoice.client.first_name} {invoice.client.last_name}
                        {invoice.client.company && ` - ${invoice.client.company}`}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusLabel(invoice.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{invoice.total_amount.toLocaleString('sr-RS')} RSD</span>
                  </div>
                  {invoice.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Dospeće: {new Date(invoice.due_date).toLocaleDateString('sr-RS')}</span>
                    </div>
                  )}
                  {invoice.paid_at && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Calendar className="w-4 h-4" />
                      <span>Plaćena: {new Date(invoice.paid_at).toLocaleDateString('sr-RS')}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(invoice.created_at).toLocaleDateString('sr-RS')}
                </div>
              </div>
              {invoice.notes && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <strong>Napomene:</strong> {invoice.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Nema faktura za prikaz</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}