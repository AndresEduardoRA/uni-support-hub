import { Badge } from '@/components/ui/badge';

type TicketStatus = 'abierto' | 'asignado' | 'en_proceso' | 'resuelto' | 'cerrado';

interface StatusBadgeProps {
  status: TicketStatus;
}

const statusConfig = {
  abierto: { label: 'Abierto', className: 'bg-info text-info-foreground' },
  asignado: { label: 'Asignado', className: 'bg-warning text-warning-foreground' },
  en_proceso: { label: 'En Proceso', className: 'bg-status-inProgress text-white' },
  resuelto: { label: 'Resuelto', className: 'bg-success text-success-foreground' },
  cerrado: { label: 'Cerrado', className: 'bg-status-closed text-white' },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
};
