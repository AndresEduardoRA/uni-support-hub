-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('usuario', 'agente', 'administrador');

-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('abierto', 'asignado', 'en_proceso', 'resuelto', 'cerrado');

-- Create enum for ticket priority
CREATE TYPE public.ticket_priority AS ENUM ('baja', 'media', 'alta', 'urgente');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
('Hardware', 'Problemas con equipos físicos (PC, impresoras, proyectores)'),
('Software', 'Problemas con aplicaciones y programas'),
('Redes/WiFi', 'Problemas de conectividad y red'),
('Acceso/Cuentas', 'Problemas de acceso a sistemas y cuentas'),
('Periféricos', 'Problemas con mouse, teclado, cámaras'),
('Otro', 'Otros problemas técnicos');

-- Create locations table
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    building TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Insert default locations
INSERT INTO public.locations (name, building) VALUES
('Aula 101', 'Edificio A'),
('Aula 102', 'Edificio A'),
('Biblioteca', 'Edificio B'),
('Laboratorio de Cómputo 1', 'Edificio C'),
('Laboratorio de Cómputo 2', 'Edificio C'),
('Oficina Administrativa', 'Edificio Central'),
('Sala de Profesores', 'Edificio A'),
('Auditorio', 'Edificio Principal');

-- Create tickets table
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'abierto' NOT NULL,
    priority ticket_priority DEFAULT 'media' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    internal BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger for tickets updated_at
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'department', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'usuario');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for categories
CREATE POLICY "Everyone can view active categories"
ON public.categories FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can delete categories"
ON public.categories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for locations
CREATE POLICY "Everyone can view active locations"
ON public.locations FOR SELECT
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can insert locations"
ON public.locations FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can update locations"
ON public.locations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Only admins can delete locations"
ON public.locations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for tickets
CREATE POLICY "Users can view own tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  assigned_to = auth.uid() OR
  public.has_role(auth.uid(), 'administrador')
);

CREATE POLICY "Users can create own tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can update assigned tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid() AND status != 'cerrado'
);

CREATE POLICY "Admins can update any ticket"
ON public.tickets FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Users can close own resolved tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() AND status = 'resuelto'
)
WITH CHECK (status = 'cerrado');

-- RLS Policies for comments
CREATE POLICY "Users can view comments on accessible tickets"
ON public.comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND (
      t.user_id = auth.uid() OR
      t.assigned_to = auth.uid() OR
      public.has_role(auth.uid(), 'administrador')
    )
  )
  AND (
    internal = false OR
    public.has_role(auth.uid(), 'agente') OR
    public.has_role(auth.uid(), 'administrador')
  )
);

CREATE POLICY "Users can create comments on accessible tickets"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND (
      t.user_id = auth.uid() OR
      t.assigned_to = auth.uid() OR
      public.has_role(auth.uid(), 'administrador')
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_comments_ticket_id ON public.comments(ticket_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);