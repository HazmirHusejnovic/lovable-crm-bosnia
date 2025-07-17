import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, User, Mail, Phone, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  role: 'admin' | 'worker' | 'client';
  hourly_rate: number;
  position?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Users() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    role: 'client' as 'admin' | 'worker' | 'client',
    hourly_rate: 0,
    position: '',
    is_active: true
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({ title: 'Greška', description: 'Neuspešno učitavanje korisnika', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', editingProfile.id);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Korisnik je uspešno ažuriran' });
      }
      
      fetchProfiles();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ title: 'Greška', description: 'Neuspešno čuvanje korisnika', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      role: 'client',
      hourly_rate: 0,
      position: '',
      is_active: true
    });
    setEditingProfile(null);
  };

  const handleEdit = (profileData: Profile) => {
    setEditingProfile(profileData);
    setFormData({
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      email: profileData.email,
      phone: profileData.phone || '',
      company: profileData.company || '',
      role: profileData.role,
      hourly_rate: profileData.hourly_rate || 0,
      position: profileData.position || '',
      is_active: profileData.is_active
    });
    setIsDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      worker: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrator',
      worker: 'Radnik',
      client: 'Klijent'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Only admins can see and edit users
  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nemate dozvolu za pristup ovoj stranici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Korisnici</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pretraži korisnike..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve uloge</SelectItem>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="worker">Radnik</SelectItem>
            <SelectItem value="client">Klijent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.map((userProfile) => (
          <Card key={userProfile.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(userProfile)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {userProfile.first_name} {userProfile.last_name}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className={getRoleColor(userProfile.role)}>
                    {getRoleLabel(userProfile.role)}
                  </Badge>
                  {!userProfile.is_active && (
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Neaktivan
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{userProfile.email}</span>
                </div>
                {userProfile.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{userProfile.phone}</span>
                  </div>
                )}
                {userProfile.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="w-4 h-4" />
                    <span>{userProfile.company}</span>
                  </div>
                )}
                {userProfile.position && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">Pozicija:</span> {userProfile.position}
                  </div>
                )}
                {userProfile.hourly_rate > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">Satnica:</span> {userProfile.hourly_rate} RSD/h
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">
                  Kreiran: {new Date(userProfile.created_at).toLocaleDateString('sr-RS')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredProfiles.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Nema korisnika za prikaz</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uredi korisnika</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ime</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Prezime</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Kompanija</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Uloga</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Klijent</SelectItem>
                    <SelectItem value="worker">Radnik</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pozicija</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Satnica (RSD)</Label>
              <Input
                type="number"
                min="0"
                step="50"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
              <Label htmlFor="is_active">Aktivan korisnik</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Ažuriraj</Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Otkaži
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}