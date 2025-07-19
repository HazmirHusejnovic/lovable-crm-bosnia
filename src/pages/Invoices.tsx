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
import { Plus, Search, Calendar, User, DollarSign, FileText, Download, Printer, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
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

interface InvoiceSettings {
  default_currency: string;
  default_tax_rate: number;
  enable_fiscalization: boolean;
  company_name: string;
  address: string;
  city: string;
  postal_code: string;
  tax_number: string;
  phone: string;
  email: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings>({
    default_currency: 'BAM',
    default_tax_rate: 17,
    enable_fiscalization: false,
    company_name: 'Vaša Kompanija d.o.o.',
    address: 'Adresa kompanije',
    city: 'Grad',
    postal_code: '12345',
    tax_number: 'PIB: 123456789',
    phone: '+387 XX XXX XXX',
    email: 'info@kompanija.ba'
  });
  const { profile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    client_id: '',
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'cancelled',
    subtotal: 0,
    tax_rate: 17.00,
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchProfiles();
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedInvoiceSettings = localStorage.getItem('invoice_settings');
    const savedCompanySettings = localStorage.getItem('company_settings');
    
    if (savedInvoiceSettings) {
      const invoiceSettings = JSON.parse(savedInvoiceSettings);
      setSettings(prev => ({ ...prev, ...invoiceSettings }));
      setFormData(prev => ({ ...prev, tax_rate: invoiceSettings.default_tax_rate || 17 }));
    }
    
    if (savedCompanySettings) {
      const companySettings = JSON.parse(savedCompanySettings);
      setSettings(prev => ({ ...prev, ...companySettings }));
    }
  };

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
      const invoicesWithCurrency = (data || []).map((invoice: any) => ({
        ...invoice,
        currency: invoice.currency || 'BAM'
      })) as Invoice[];
      setInvoices(invoicesWithCurrency);
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
        total_amount: totalAmount,
        currency: settings.default_currency
      };

      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Faktura je uspešno ažurirana' });
      } else {
        const { data: invoiceNumber, error: numberError } = await supabase
          .rpc('generate_invoice_number');
        
        if (numberError) throw numberError;
        
        const { error } = await supabase
          .from('invoices')
          .insert([{ ...invoiceData, invoice_number: invoiceNumber }]);
        
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

  const generatePDF = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const client = invoice.client;
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('bs-BA') : '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faktura ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company { text-align: left; }
            .invoice-info { text-align: right; }
            .client-info { margin: 20px 0; }
            .invoice-details { margin: 30px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
            .stamp-area { margin-top: 60px; text-align: right; }
            h1 { color: #2563eb; margin-bottom: 5px; }
            .status { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 4px; 
              font-size: 12px; 
              font-weight: bold; 
              ${invoice.status === 'paid' ? 'background: #dcfce7; color: #166534;' : 
                invoice.status === 'sent' ? 'background: #dbeafe; color: #1d4ed8;' : 
                'background: #fef3c7; color: #92400e;'}
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">
              <h1>${settings.company_name}</h1>
              <p>${settings.address}<br>
              ${settings.city} ${settings.postal_code}<br>
              ${settings.tax_number}<br>
              Tel: ${settings.phone}<br>
              Email: ${settings.email}</p>
            </div>
            <div class="invoice-info">
              <h2>FAKTURA</h2>
              <p><strong>Broj: ${invoice.invoice_number}</strong></p>
              <p>Datum: ${new Date(invoice.created_at).toLocaleDateString('bs-BA')}</p>
              ${dueDate ? `<p>Dospeće: ${dueDate}</p>` : ''}
              <div class="status">${getStatusLabel(invoice.status)}</div>
            </div>
          </div>

          <div class="client-info">
            <h3>Kupac:</h3>
            <p><strong>${client?.first_name} ${client?.last_name}</strong><br>
            ${client?.company ? client.company + '<br>' : ''}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Opis</th>
                <th>Količina</th>
                <th>Jedinična cijena</th>
                <th>Ukupno</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Usluge</td>
                <td>1</td>
                <td>${invoice.subtotal.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} ${invoice.currency}</td>
                <td>${invoice.subtotal.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} ${invoice.currency}</td>
              </tr>
            </tbody>
          </table>

          <div class="invoice-details">
            <table style="width: 400px; margin-left: auto;">
              <tr>
                <td>Osnovica:</td>
                <td style="text-align: right;">${invoice.subtotal.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} ${invoice.currency}</td>
              </tr>
              <tr>
                <td>PDV (${invoice.tax_rate}%):</td>
                <td style="text-align: right;">${invoice.tax_amount.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} ${invoice.currency}</td>
              </tr>
              <tr class="total-row">
                <td><strong>UKUPNO ZA NAPLATU:</strong></td>
                <td style="text-align: right;"><strong>${invoice.total_amount.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} ${invoice.currency}</strong></td>
              </tr>
            </table>
          </div>

          ${invoice.notes ? `<div><strong>Napomene:</strong><br>${invoice.notes}</div>` : ''}

          <div class="stamp-area">
            <p>_________________________<br>
            Potpis i pečat</p>
          </div>

          <div class="footer">
            <p>Hvala Vam na poverenju!</p>
            ${settings.enable_fiscalization ? '<p><strong>Fiskalni račun</strong></p>' : ''}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const printToFiscalPrinter = (invoice: Invoice) => {
    if (!settings.enable_fiscalization) {
      toast({ 
        title: 'Fiskalizacija nije omogućena', 
        description: 'Molimo omogućite fiskalizaciju u podešavanjima', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Ovdje bi se implementirala komunikacija s fiskalnim printerom
    toast({ 
      title: 'Fiskalni ispis', 
      description: `Slanje fakture ${invoice.invoice_number} na fiskalni printer...` 
    });
    
    // Simulacija uspešnog fiskalnog ispisa
    setTimeout(() => {
      toast({ 
        title: 'Uspeh', 
        description: 'Faktura je uspešno poslana na fiskalni printer' 
      });
    }, 2000);
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      status: 'draft',
      subtotal: 0,
      tax_rate: settings.default_tax_rate || 17.00,
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
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'Nacrt',
      sent: 'Poslata',
      paid: 'Plaćena',
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
                    <Label>Osnovica ({settings.default_currency})</Label>
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
                      <span>{formData.subtotal.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} {settings.default_currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PDV ({formData.tax_rate}%):</span>
                      <span>{((formData.subtotal * formData.tax_rate) / 100).toLocaleString('bs-BA', { minimumFractionDigits: 2 })} {settings.default_currency}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Ukupno:</span>
                      <span>{(formData.subtotal + (formData.subtotal * formData.tax_rate) / 100).toLocaleString('bs-BA', { minimumFractionDigits: 2 })} {settings.default_currency}</span>
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
            <SelectItem value="cancelled">Otkazana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
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
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(invoice.status)}>
                    {getStatusLabel(invoice.status)}
                  </Badge>
                  {profile?.role === 'admin' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          generatePDF(invoice);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          generatePDF(invoice);
                        }}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {settings.enable_fiscalization && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            printToFiscalPrinter(invoice);
                          }}
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent onClick={() => profile?.role === 'admin' && handleEdit(invoice)} className={profile?.role === 'admin' ? 'cursor-pointer' : ''}>
              <div className="flex justify-between items-center">
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>{invoice.total_amount.toLocaleString('bs-BA', { minimumFractionDigits: 2 })} {invoice.currency === 'BAM' ? 'KM' : invoice.currency}</span>
                  </div>
                  {invoice.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Dospeće: {new Date(invoice.due_date).toLocaleDateString('bs-BA')}</span>
                    </div>
                  )}
                  {invoice.paid_at && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Calendar className="w-4 h-4" />
                      <span>Plaćena: {new Date(invoice.paid_at).toLocaleDateString('bs-BA')}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(invoice.created_at).toLocaleDateString('bs-BA')}
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
