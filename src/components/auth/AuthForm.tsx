import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Greška prilikom prijave',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Uspješno ste se prijavili',
          description: 'Dobrodošli u CRM sistem!',
        });
      }
    } catch (error) {
      toast({
        title: 'Greška',
        description: 'Dogodila se neočekivana greška. Molimo pokušajte ponovo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    try {
      const { error } = await signUp(email, password, firstName, lastName);
      
      if (error) {
        toast({
          title: 'Greška prilikom registracije',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Uspješno ste se registrirali',
          description: 'Molimo provjerite vašu email adresu za potvrdu.',
        });
        setActiveTab('signin');
      }
    } catch (error) {
      toast({
        title: 'Greška',
        description: 'Dogodila se neočekivana greška. Molimo pokušajte ponovo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">CRM Sistem</CardTitle>
          <CardDescription>
            Prijavite se ili se registrirajte za pristup sistemu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Prijava</TabsTrigger>
              <TabsTrigger value="signup">Registracija</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="form-group">
                  <Label htmlFor="email">Email adresa</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vasa@email.com"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="password">Lozinka</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Unesite lozinku"
                    required
                    disabled={loading}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Prijavljujem...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Prijavite se
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="firstName">Ime</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Ime"
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="lastName">Prezime</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Prezime"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <Label htmlFor="email">Email adresa</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vasa@email.com"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="password">Lozinka</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Unesite lozinku"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registriram...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Registrirajte se
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}