import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect based on user role
  if (userRole === 'administrador') {
    return <Navigate to="/admin" replace />;
  }
  
  if (userRole === 'agente') {
    return <Navigate to="/agente" replace />;
  }
  
  return <Navigate to="/usuario" replace />;
}
