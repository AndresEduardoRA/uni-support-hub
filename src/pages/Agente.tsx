import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MessageSquare, CheckCircle, Play } from 'lucide-react';

export default function Agente() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [resolutionComment, setResolutionComment] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        categories(name),
        locations(name, building),
        profiles!tickets_user_id_fkey(full_name, email)
      `)
      .eq('assigned_to', user?.id)
      .neq('status', 'cerrado')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar tickets');
    } else {
      setTickets(data || []);
    }
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

  const handleStartWork = async (ticketId: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'en_proceso' })
      .eq('id', ticketId);

    if (error) {
      toast.error('Error al cambiar estado');
    } else {
      toast.success('Ticket en proceso');
      fetchTickets();
    }
  };

  const handleResolve = async () => {
    if (!resolutionComment.trim()) {
      toast.error('Debes agregar un comentario de solución');
      return;
    }

    // Add resolution comment
    const { error: commentError } = await supabase.from('comments').insert({
      ticket_id: selectedTicket.id,
      user_id: user?.id,
      content: resolutionComment,
      internal: false,
    });

    if (commentError) {
      toast.error('Error al agregar comentario');
      return;
    }

    // Update ticket status
    const { error } = await supabase
      .from('tickets')
      .update({ 
        status: 'resuelto',
        resolved_at: new Date().toISOString()
      })
      .eq('id', selectedTicket.id);

    if (error) {
      toast.error('Error al resolver ticket');
    } else {
      toast.success('Ticket resuelto exitosamente');
      setResolutionComment('');
      setSelectedTicket(null);
      fetchTickets();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;

    const { error } = await supabase.from('comments').insert({
      ticket_id: selectedTicket.id,
      user_id: user?.id,
      content: newComment,
      internal: isInternal,
    });

    if (error) {
      toast.error('Error al agregar comentario');
    } else {
      toast.success('Comentario agregado');
      setNewComment('');
      fetchComments(selectedTicket.id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Mi Cola de Trabajo</h1>
          <p className="text-muted-foreground">Tickets asignados a ti</p>
        </div>

        <div className="grid gap-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No tienes tickets asignados</p>
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
                        Reportado por: {ticket.profiles.full_name} ({ticket.profiles.email})
                      </CardDescription>
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
                    {ticket.status === 'asignado' && (
                      <Button onClick={() => handleStartWork(ticket.id)} size="sm">
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar Trabajo
                      </Button>
                    )}
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
                          Gestionar
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
                                  <div key={comment.id} className={`p-3 rounded-lg ${comment.internal ? 'bg-amber-100 dark:bg-amber-900' : 'bg-muted'}`}>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">{comment.profiles.full_name}</p>
                                      {comment.internal && <span className="text-xs text-amber-700 dark:text-amber-300">(Interno)</span>}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Agregar Comentario</Label>
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Escribe tu comentario..."
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="internal"
                                checked={isInternal}
                                onChange={(e) => setIsInternal(e.target.checked)}
                              />
                              <Label htmlFor="internal">Comentario interno (no visible para el usuario)</Label>
                            </div>
                            <Button onClick={handleAddComment}>Enviar</Button>
                          </div>
                          {selectedTicket?.status === 'en_proceso' && (
                            <div className="space-y-2 border-t pt-4">
                              <Label>Marcar como Resuelto</Label>
                              <Textarea
                                value={resolutionComment}
                                onChange={(e) => setResolutionComment(e.target.value)}
                                placeholder="Describe la solución aplicada..."
                                required
                              />
                              <Button onClick={handleResolve} className="w-full">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Resolver Ticket
                              </Button>
                            </div>
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
