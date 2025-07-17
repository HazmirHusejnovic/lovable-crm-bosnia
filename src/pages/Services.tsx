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
import { Plus, Search, DollarSign, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  service_type: 'hourly' | 'fixed';
  is_billable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    service_type: 'hourly' as 'hourly' | 'fixed',
    is_billable: true,
    is_active: true
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({ title: 'Greška', description: 'Neuspešno učitavanje usluga', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(formData)
          .eq('id', editingService.id);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Usluga je uspešno ažurirana' });
      } else {
        const { error } = await supabase
          .from('services')
          .insert([formData]);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Usluga je uspešno kreirana' });
      }
      
      fetchServices();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving service:', error);
      toast({ title: 'Greška', description: 'Neuspešno čuvanje usluge', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      service_type: 'hourly',
      is_billable: true,
      is_active: true
    });
    setEditingService(null);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price || 0,
      service_type: service.service_type,
      is_billable: service.is_billable,
      is_active: service.is_active
    });
    setIsDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    const colors = {
      hourly: 'bg-blue-100 text-blue-800',
      fixed: 'bg-green-100 text-green-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      hourly: 'Po satu',
      fixed: 'Fiksna cena'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || service.service_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Usluge</h1>
        {profile?.role === 'admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova usluga
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingService ? 'Uredi uslugu' : 'Nova usluga'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Naziv</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                    <Label>Cena (RSD)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Tip</Label>
                    <Select value={formData.service_type} onValueChange={(value: any) => setFormData({...formData, service_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Po satu</SelectItem>
                        <SelectItem value="fixed">Fiksna cena</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_billable"
                      checked={formData.is_billable}
                      onChange={(e) => setFormData({...formData, is_billable: e.target.checked})}
                    />
                    <Label htmlFor="is_billable">Naplatljivo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    />
                    <Label htmlFor="is_active">Aktivno</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingService ? 'Ažuriraj' : 'Kreiraj'}</Button>
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
            placeholder="Pretraži usluge..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi tipovi</SelectItem>
            <SelectItem value="hourly">Po satu</SelectItem>
            <SelectItem value="fixed">Fiksna cena</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => (
          <Card key={service.id} className={`cursor-pointer hover:shadow-md transition-shadow ${profile?.role === 'admin' ? '' : 'pointer-events-none'}`} onClick={() => profile?.role === 'admin' && handleEdit(service)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{service.name}</CardTitle>
                <div className="flex gap-2 flex-col">
                  <Badge className={getTypeColor(service.service_type)}>
                    {getTypeLabel(service.service_type)}
                  </Badge>
                  {!service.is_active && (
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Neaktivno
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {service.description && (
                <p className="text-muted-foreground mb-3 text-sm">{service.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <DollarSign className="w-5 h-5" />
                  <span>{service.price.toLocaleString('sr-RS')} RSD</span>
                  {service.service_type === 'hourly' && (
                    <span className="text-sm text-muted-foreground">/sat</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {service.is_billable && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      Naplatljivo
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-3">
                Kreirana: {new Date(service.created_at).toLocaleDateString('sr-RS')}
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredServices.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Nema usluga za prikaz</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}