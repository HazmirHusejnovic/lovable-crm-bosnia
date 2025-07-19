
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, User, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  receiver_id?: string;
  ticket_id?: string;
  task_id?: string;
  is_group_message: boolean;
  created_at: string;
  sender?: { first_name: string; last_name: string; role: string };
  receiver?: { first_name: string; last_name: string };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchMessages();
      fetchProfiles();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('chat_messages')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chat_messages' },
          () => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!profile?.id) return;
    
    try {
      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(first_name, last_name, role),
          receiver:profiles!chat_messages_receiver_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: true });

      // Ako nije grupna poruka i ima odabranog primaoca, filtriraj poruke
      if (!isGroupMessage && selectedReceiver) {
        query = query.or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedReceiver}),and(sender_id.eq.${selectedReceiver},receiver_id.eq.${profile.id})`);
      } else if (isGroupMessage) {
        query = query.eq('is_group_message', true);
      } else {
        // Prikaži sve poruke za korisnika
        query = query.or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id},is_group_message.eq.true`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({ title: 'Greška', description: 'Neuspešno učitavanje poruka', variant: 'destructive' });
    }
  };

  const fetchProfiles = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .neq('id', profile.id)
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !profile?.id) return;

    // Validacija: za privatne poruke mora biti odabran primalac
    if (!isGroupMessage && !selectedReceiver) {
      toast({ title: 'Greška', description: 'Molimo odaberite osobu za privatnu poruku', variant: 'destructive' });
      return;
    }

    try {
      const messageData = {
        message: newMessage.trim(),
        sender_id: profile.id,
        receiver_id: isGroupMessage ? null : selectedReceiver,
        is_group_message: isGroupMessage
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData]);

      if (error) throw error;
      
      setNewMessage('');
      toast({ title: 'Uspeh', description: 'Poruka je poslata' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Greška', description: 'Neuspešno slanje poruke', variant: 'destructive' });
    }
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
      admin: 'Admin',
      worker: 'Radnik',
      client: 'Klijent'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getSelectedReceiverName = () => {
    if (!selectedReceiver) return '';
    const person = profiles.find(p => p.id === selectedReceiver);
    return person ? `${person.first_name} ${person.last_name}` : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Chat</h1>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chat opcije</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tip poruke</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="private"
                      name="messageType"
                      checked={!isGroupMessage}
                      onChange={() => {
                        setIsGroupMessage(false);
                        fetchMessages();
                      }}
                    />
                    <label htmlFor="private" className="text-sm">Privatna poruka</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="group"
                      name="messageType"
                      checked={isGroupMessage}
                      onChange={() => {
                        setIsGroupMessage(true);
                        setSelectedReceiver('');
                        fetchMessages();
                      }}
                    />
                    <label htmlFor="group" className="text-sm">Grupna poruka</label>
                  </div>
                </div>
              </div>

              {!isGroupMessage && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Primalac</label>
                  <Select 
                    value={selectedReceiver} 
                    onValueChange={(value) => {
                      setSelectedReceiver(value);
                      setTimeout(() => fetchMessages(), 100);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberi osobu" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(person => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.first_name} {person.last_name} ({getRoleLabel(person.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Korisnici</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {profiles.map(person => (
                    <div key={person.id} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted cursor-pointer"
                         onClick={() => {
                           if (!isGroupMessage) {
                             setSelectedReceiver(person.id);
                             setTimeout(() => fetchMessages(), 100);
                           }
                         }}>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="flex-1">{person.first_name} {person.last_name}</span>
                      <Badge className={`${getRoleColor(person.role)} text-xs`}>
                        {getRoleLabel(person.role)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                {isGroupMessage ? 'Grupni chat' : selectedReceiver ? `Chat sa ${getSelectedReceiverName()}` : 'Izaberite osobu za chat'}
              </CardTitle>
            </CardHeader>
            
            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                    message.sender_id === profile?.id 
                      ? 'bg-primary text-primary-foreground ml-4' 
                      : 'bg-muted mr-4'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {message.sender?.first_name} {message.sender?.last_name}
                      </span>
                      {message.sender?.role && (
                        <Badge className={`${getRoleColor(message.sender.role)} text-xs`}>
                          {getRoleLabel(message.sender.role)}
                        </Badge>
                      )}
                      {message.is_group_message && (
                        <Badge variant="outline" className="text-xs">
                          Grupa
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(message.created_at).toLocaleString('bs-BA')}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Message Input */}
            <div className="flex-shrink-0 p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    isGroupMessage 
                      ? "Napišite grupnu poruku..." 
                      : selectedReceiver 
                        ? "Napišite poruku..." 
                        : "Izaberite osobu za chat"
                  }
                  disabled={!isGroupMessage && !selectedReceiver}
                  className="flex-1"
                  maxLength={1000}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || (!isGroupMessage && !selectedReceiver)}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
