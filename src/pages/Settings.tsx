import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Bell, Shield, FileText, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [companySettings, setCompanySettings] = useState({
    company_name: 'Vaša Kompanija d.o.o.',
    address: 'Adresa kompanije',
    city: 'Grad',
    postal_code: '12345',
    country: 'Bosna i Hercegovina',
    tax_number: 'PIB: 123456789',
    registration_number: 'MB: 987654321',
    phone: '+387 XX XXX XXX',
    email: 'info@vasaKompanija.ba',
    website: 'www.vasaKompanija.ba'
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    default_currency: 'BAM',
    default_tax_rate: 17,
    payment_terms: 30,
    late_fee_percentage: 5,
    bank_account: 'IBAN: BA39 1234 5678 9012 3456',
    swift_code: 'BANKBAHB',
    enable_fiscalization: false,
    fiscal_device: '',
    certification_path: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    task_reminders: true,
    invoice_reminders: true,
    overdue_notifications: true,
    daily_summary: false
  });

  const [userSettings, setUserSettings] = useState({
    theme: 'system',
    language: 'sr-RS',
    timezone: 'Europe/Sarajevo',
    date_format: 'dd.MM.yyyy',
    time_format: '24h'
  });

  const handleSaveCompanySettings = async () => {
    try {
      // In a real app, you would save these to a settings table
      localStorage.setItem('company_settings', JSON.stringify(companySettings));
      toast({ title: 'Uspeh', description: 'Podešavanja kompanije su sačuvana' });
    } catch (error) {
      toast({ title: 'Greška', description: 'Neuspešno čuvanje podešavanja', variant: 'destructive' });
    }
  };

  const handleSaveInvoiceSettings = async () => {
    try {
      localStorage.setItem('invoice_settings', JSON.stringify(invoiceSettings));
      toast({ title: 'Uspeh', description: 'Podešavanja faktura su sačuvana' });
    } catch (error) {
      toast({ title: 'Greška', description: 'Neuspešno čuvanje podešavanja', variant: 'destructive' });
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
      toast({ title: 'Uspeh', description: 'Podešavanja notifikacija su sačuvana' });
    } catch (error) {
      toast({ title: 'Greška', description: 'Neuspešno čuvanje podešavanja', variant: 'destructive' });
    }
  };

  const handleSaveUserSettings = async () => {
    try {
      localStorage.setItem('user_settings', JSON.stringify(userSettings));
      toast({ title: 'Uspeh', description: 'Korisnička podešavanja su sačuvana' });
    } catch (error) {
      toast({ title: 'Greška', description: 'Neuspešno čuvanje podešavanja', variant: 'destructive' });
    }
  };

  useEffect(() => {
    // Load settings from localStorage
    const savedCompanySettings = localStorage.getItem('company_settings');
    const savedInvoiceSettings = localStorage.getItem('invoice_settings');
    const savedNotificationSettings = localStorage.getItem('notification_settings');
    const savedUserSettings = localStorage.getItem('user_settings');

    if (savedCompanySettings) {
      setCompanySettings(JSON.parse(savedCompanySettings));
    }
    if (savedInvoiceSettings) {
      setInvoiceSettings(JSON.parse(savedInvoiceSettings));
    }
    if (savedNotificationSettings) {
      setNotificationSettings(JSON.parse(savedNotificationSettings));
    }
    if (savedUserSettings) {
      setUserSettings(JSON.parse(savedUserSettings));
    }
  }, []);

  // Only admins can access settings
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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-8 h-8" />
          Podešavanja
        </h1>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company">Kompanija</TabsTrigger>
          <TabsTrigger value="invoices">Fakture</TabsTrigger>
          <TabsTrigger value="notifications">Notifikacije</TabsTrigger>
          <TabsTrigger value="user">Korisnik</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Podešavanja kompanije
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Naziv kompanije</Label>
                  <Input
                    value={companySettings.company_name}
                    onChange={(e) => setCompanySettings({...companySettings, company_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Adresa</Label>
                <Input
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Grad</Label>
                  <Input
                    value={companySettings.city}
                    onChange={(e) => setCompanySettings({...companySettings, city: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Poštanski broj</Label>
                  <Input
                    value={companySettings.postal_code}
                    onChange={(e) => setCompanySettings({...companySettings, postal_code: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Zemlja</Label>
                  <Input
                    value={companySettings.country}
                    onChange={(e) => setCompanySettings({...companySettings, country: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PIB</Label>
                  <Input
                    value={companySettings.tax_number}
                    onChange={(e) => setCompanySettings({...companySettings, tax_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Matični broj</Label>
                  <Input
                    value={companySettings.registration_number}
                    onChange={(e) => setCompanySettings({...companySettings, registration_number: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={companySettings.website}
                    onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleSaveCompanySettings}>Sačuvaj podešavanja kompanije</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Podešavanja faktura i fiskalizacije
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Valuta</Label>
                  <Select value={invoiceSettings.default_currency} onValueChange={(value) => setInvoiceSettings({...invoiceSettings, default_currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAM">BAM - Konvertibilna marka</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - Dolar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PDV stopa (%)</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.default_tax_rate}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, default_tax_rate: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Dani plaćanja</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.payment_terms}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, payment_terms: parseInt(e.target.value) || 30})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Zatezna kamata (%)</Label>
                  <Input
                    type="number"
                    value={invoiceSettings.late_fee_percentage}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, late_fee_percentage: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>SWIFT kod</Label>
                  <Input
                    value={invoiceSettings.swift_code}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, swift_code: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Račun banke (IBAN)</Label>
                <Input
                  value={invoiceSettings.bank_account}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, bank_account: e.target.value})}
                />
              </div>
              
              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-semibold mb-4">Fiskalizacija</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Omogući fiskalizaciju</Label>
                      <p className="text-sm text-muted-foreground">Aktivirati fiskalni uređaj za izdavanje računa</p>
                    </div>
                    <Switch
                      checked={invoiceSettings.enable_fiscalization}
                      onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, enable_fiscalization: checked})}
                    />
                  </div>
                  
                  {invoiceSettings.enable_fiscalization && (
                    <>
                      <div>
                        <Label>Fiskalni uređaj</Label>
                        <Select value={invoiceSettings.fiscal_device} onValueChange={(value) => setInvoiceSettings({...invoiceSettings, fiscal_device: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite fiskalni uređaj" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tremol">Tremol FP-2000</SelectItem>
                            <SelectItem value="datecs">Datecs FP-550</SelectItem>
                            <SelectItem value="custom">Prilagođeni uređaj</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Putanja do sertifikata</Label>
                        <Input
                          value={invoiceSettings.certification_path}
                          onChange={(e) => setInvoiceSettings({...invoiceSettings, certification_path: e.target.value})}
                          placeholder="/path/to/certificate.p12"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <Button onClick={handleSaveInvoiceSettings}>Sačuvaj podešavanja faktura</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Podešavanja notifikacija
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email notifikacije</Label>
                    <p className="text-sm text-muted-foreground">Primaj notifikacije putem emaila</p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_notifications}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, email_notifications: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Podsetnici za zadatke</Label>
                    <p className="text-sm text-muted-foreground">Podseti me na nadolazeće rokove</p>
                  </div>
                  <Switch
                    checked={notificationSettings.task_reminders}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, task_reminders: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Podsetnici za fakture</Label>
                    <p className="text-sm text-muted-foreground">Podseti me na neplaćene fakture</p>
                  </div>
                  <Switch
                    checked={notificationSettings.invoice_reminders}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, invoice_reminders: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Notifikacije o kašnjenju</Label>
                    <p className="text-sm text-muted-foreground">Obavesti me o kašnjenjima u plaćanju</p>
                  </div>
                  <Switch
                    checked={notificationSettings.overdue_notifications}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, overdue_notifications: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Dnevni izvештај</Label>
                    <p className="text-sm text-muted-foreground">Pošalji mi dnevni sažetak aktivnosti</p>
                  </div>
                  <Switch
                    checked={notificationSettings.daily_summary}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, daily_summary: checked})}
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveNotificationSettings}>Sačuvaj podešavanja notifikacija</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Korisnička podešavanja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tema</Label>
                  <Select value={userSettings.theme} onValueChange={(value) => setUserSettings({...userSettings, theme: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Sistemska</SelectItem>
                      <SelectItem value="light">Svetla</SelectItem>
                      <SelectItem value="dark">Tamna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jezik</Label>
                  <Select value={userSettings.language} onValueChange={(value) => setUserSettings({...userSettings, language: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sr-RS">Srpski</SelectItem>
                      <SelectItem value="bs-BA">Bosanski</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Vremenska zona</Label>
                  <Select value={userSettings.timezone} onValueChange={(value) => setUserSettings({...userSettings, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Sarajevo">Sarajevo</SelectItem>
                      <SelectItem value="Europe/Belgrade">Beograd</SelectItem>
                      <SelectItem value="Europe/Zagreb">Zagreb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format datuma</Label>
                  <Select value={userSettings.date_format} onValueChange={(value) => setUserSettings({...userSettings, date_format: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd.MM.yyyy">DD.MM.YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format vremena</Label>
                  <Select value={userSettings.time_format} onValueChange={(value) => setUserSettings({...userSettings, time_format: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24-časa</SelectItem>
                      <SelectItem value="12h">12-časa (AM/PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleSaveUserSettings}>Sačuvaj korisnička podešavanja</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}