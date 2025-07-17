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
import { Plus, Search, BookOpen, User, Calendar, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WikiArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  is_published: boolean;
  author_id?: string;
  created_at: string;
  updated_at: string;
  author?: { first_name: string; last_name: string };
}

export default function Wiki() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<WikiArticle | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    is_published: false
  });

  const categories = ['FAQ', 'Dokumentacija', 'Procedure', 'Politike', 'Ostalo'];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('wiki_articles')
        .select(`
          *,
          author:profiles!wiki_articles_author_id_fkey(first_name, last_name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({ title: 'Greška', description: 'Neuspešno učitavanje članaka', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const articleData = {
        ...formData,
        author_id: profile?.id
      };

      if (editingArticle) {
        const { error } = await supabase
          .from('wiki_articles')
          .update(articleData)
          .eq('id', editingArticle.id);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Članak je uspešno ažuriran' });
      } else {
        const { error } = await supabase
          .from('wiki_articles')
          .insert([articleData]);
        
        if (error) throw error;
        toast({ title: 'Uspeh', description: 'Članak je uspešno kreiran' });
      }
      
      fetchArticles();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving article:', error);
      toast({ title: 'Greška', description: 'Neuspešno čuvanje članka', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      is_published: false
    });
    setEditingArticle(null);
  };

  const handleEdit = (article: WikiArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category || '',
      is_published: article.is_published
    });
    setIsDialogOpen(true);
  };

  const handleView = (article: WikiArticle) => {
    setSelectedArticle(article);
    setIsViewDialogOpen(true);
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const canEdit = profile?.role === 'admin' || profile?.role === 'worker';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Wiki</h1>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novi članak
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingArticle ? 'Uredi članak' : 'Novi članak'}</DialogTitle>
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
                  <Label>Kategorija</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberi kategoriju" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sadržaj</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={15}
                    className="min-h-[300px]"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                  />
                  <Label htmlFor="is_published">Objavi članak</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingArticle ? 'Ažuriraj' : 'Kreiraj'}</Button>
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
            placeholder="Pretraži članke..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve kategorije</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredArticles.map((article) => (
          <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    {article.author && (
                      <p className="text-sm text-muted-foreground">
                        {article.author.first_name} {article.author.last_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {article.category && (
                    <Badge variant="outline">
                      <Tag className="w-3 h-3 mr-1" />
                      {article.category}
                    </Badge>
                  )}
                  {article.is_published ? (
                    <Badge className="bg-green-100 text-green-800">
                      Objavljeno
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      Nacrt
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground line-clamp-3 mb-4">
                {article.content.substring(0, 200)}...
              </p>
              <div className="flex justify-between items-center">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Ažurirano: {new Date(article.updated_at).toLocaleDateString('sr-RS')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(article);
                    }}
                  >
                    Prikaži
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(article);
                      }}
                    >
                      Uredi
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredArticles.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Nema članaka za prikaz</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Article Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {selectedArticle?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4 text-sm text-muted-foreground">
              {selectedArticle?.author && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{selectedArticle.author.first_name} {selectedArticle.author.last_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{selectedArticle && new Date(selectedArticle.updated_at).toLocaleDateString('sr-RS')}</span>
              </div>
              {selectedArticle?.category && (
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  <span>{selectedArticle.category}</span>
                </div>
              )}
            </div>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {selectedArticle?.content}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}