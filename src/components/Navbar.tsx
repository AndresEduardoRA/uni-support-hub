import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, TicketIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, signOut, userRole } = useAuth();

  const getRoleName = () => {
    if (userRole === 'administrador') return 'Administrador';
    if (userRole === 'agente') return 'Agente TI';
    return 'Usuario';
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <TicketIcon className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">Sistema de Tickets TI</span>
        </Link>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">{getRoleName()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
