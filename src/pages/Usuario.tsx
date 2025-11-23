import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { Plus, MessageSquare, CheckCircle } from 'lucide-react';

export default function Usuario() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchTickets();
    fetchCategories();
    fetchLocations();
  }, [user]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        categories(name),
        locations(name, building),
        profiles!tickets_assigned_to_fkey(full_name)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar tickets');
    } else {
      setTickets(data || []);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true);
    setCategories(data || []);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('active', true);
    setLocations(data || []);
  };

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('tickets').insert([{
      user_id: user?.id as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category_id: formData.get('category') as string,
      location_id: formData.get('location') as string,
    }]);

    if (error) {
      toast.error('Error al crear ticket');
    } else {
      toast.success('Ticket creado exitosamente');
      fetchTickets();
      (document.getElementById('create-ticket-form') as HTMLFormElement)?.reset();
    }
    setLoading(false);
  };

  const fetchComments = async (ticketId: string) => {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profiles(full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    
    setComments(data || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;

    const { error } = await supabase.from('comments').insert({
      ticket_id: selectedTicket.id,
      user_id: user?.id,
      content: newComment,
      internal: false,
    });

    if (error) {
      toast.error('Error al agregar comentario');
    } else {
      toast.success('Comentario agregado');
      setNewComment('');
      fetchComments(selectedTicket.id);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'cerrado', closed_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      toast.error('Error al cerrar ticket');
    } else {
      toast.success('Ticket cerrado exitosamente');
      fetchTickets();
      setSelectedTicket(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mis Tickets</h1>
            <p className="text-muted-foreground">Gestiona tus solicitudes de soporte técnico</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Ticket</DialogTitle>
                <DialogDescription>
                  Describe tu problema técnico y te ayudaremos a resolverlo.
                </DialogDescription>
              </DialogHeader>
              <form id="create-ticket-form" onSubmit={handleCreateTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" name="title" placeholder="Ej: Proyector no enciende" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lugar</Label>
                    <Select name="location" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona lugar" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} - {loc.building}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción del Problema</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe detalladamente el problema..."
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Creando...' : 'Crear Ticket'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No tienes tickets aún</p>
                <p className="text-sm text-muted-foreground">Crea tu primer ticket para solicitar soporte</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      <CardDescription>
                        {ticket.categories.name} • {ticket.locations.name}
                      </CardDescription>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{ticket.description}</p>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            fetchComments(ticket.id);
                          }}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{selectedTicket?.title}</DialogTitle>
                          <DialogDescription>
                            Ticket #{selectedTicket?.id.slice(0, 8)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Estado</h4>
                            <StatusBadge status={selectedTicket?.status} />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Descripción</h4>
                            <p className="text-sm text-muted-foreground">{selectedTicket?.description}</p>
                          </div>
                          {comments.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Comentarios</h4>
                              <div className="space-y-2">
                                {comments.map((comment) => (
                                  <div key={comment.id} className="bg-muted p-3 rounded-lg">
                                    <p className="text-sm font-medium">{comment.profiles.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedTicket?.status === 'en_proceso' && (
                            <div className="space-y-2">
                              <Label>Agregar Comentario</Label>
                              <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escribe tu comentario..."
                              />
                              <Button onClick={handleAddComment}>Enviar</Button>
                            </div>
                          )}
                          {selectedTicket?.status === 'resuelto' && (
                            <Button onClick={() => handleCloseTicket(selectedTicket.id)} className="w-full">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Cerrar Ticket
                            </Button>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
