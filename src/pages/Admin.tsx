import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { UserPlus, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Admin() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, abierto: 0, en_proceso: 0, resuelto: 0 });

  useEffect(() => {
    fetchTickets();
    fetchAgents();
    fetchStats();
  }, []);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select(`
        *,
        categories(name),
        locations(name),
        profiles!tickets_user_id_fkey(full_name, email),
        assigned:profiles!tickets_assigned_to_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    setTickets(data || []);
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles(id, full_name, email)
      `)
      .eq('role', 'agente');

    setAgents(data?.map(r => r.profiles) || []);
  };

  const fetchStats = async () => {
    const { data } = await supabase.from('tickets').select('status');
    
    const stats = {
      total: data?.length || 0,
      abierto: data?.filter(t => t.status === 'abierto').length || 0,
      en_proceso: data?.filter(t => t.status === 'en_proceso').length || 0,
      resuelto: data?.filter(t => t.status === 'resuelto').length || 0,
    };
    
    setStats(stats);
  };

  const handleAssignTicket = async (ticketId: string, agentId: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ 
        assigned_to: agentId,
        status: 'asignado'
      })
      .eq('id', ticketId);

    if (error) {
      toast.error('Error al asignar ticket');
    } else {
      toast.success('Ticket asignado exitosamente');
      fetchTickets();
      fetchStats();
    }
  };

  const openTickets = tickets.filter(t => t.status === 'abierto');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestión completa del sistema de tickets</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Abiertos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats.abierto}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">En Proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.en_proceso}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resueltos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.resuelto}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assign">
          <TabsList>
            <TabsTrigger value="assign">Asignar Tickets</TabsTrigger>
            <TabsTrigger value="all">Todos los Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tickets Abiertos - Pendientes de Asignación</CardTitle>
                <CardDescription>Asigna tickets a los agentes disponibles</CardDescription>
              </CardHeader>
              <CardContent>
                {openTickets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay tickets pendientes de asignación</p>
                ) : (
                  <div className="space-y-4">
                    {openTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between border-b pb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold">{ticket.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {ticket.profiles.full_name} • {ticket.categories.name} • {ticket.locations.name}
                          </p>
                        </div>
                        <Select onValueChange={(value) => handleAssignTicket(ticket.id, value)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Asignar agente" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map((agent: any) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      <CardDescription>
                        Usuario: {ticket.profiles.full_name} • 
                        Asignado a: {ticket.assigned?.full_name || 'Sin asignar'}
                      </CardDescription>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
