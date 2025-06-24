-- =============================
-- ESQUEMA UNIFICADO DE BASE DE DATOS
-- Gestión de presupuestos grupales
-- =============================

-- 1. TABLAS PRINCIPALES

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  photo_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  qr_code VARCHAR(255),
  invite_code VARCHAR(20) UNIQUE,
  total_funds DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'inactive'))
);

CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'left')),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  objective VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'executing', 'completed', 'cancelled')),
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  target_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  actual_spent DECIMAL(12, 2) DEFAULT 0,
  execution_comments TEXT
);

CREATE TABLE IF NOT EXISTS budget_attachments (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('image', 'quote', 'link')),
  url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_responsibles (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(budget_id, user_id)
);

CREATE TABLE IF NOT EXISTS budget_votes (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(10) CHECK (vote IN ('approve', 'reject', 'abstain')),
  comment TEXT,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(budget_id, user_id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
  payment_method VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_by INTEGER REFERENCES users(id) NOT NULL,
  receipt_photo VARCHAR(255),
  approved BOOLEAN DEFAULT FALSE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- 2. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_budgets_group ON budgets(group_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_contributions_group_user ON contributions(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_budget ON expenses(budget_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);

-- 3. TRIGGERS Y FUNCIONES DE ACTUALIZACIÓN

CREATE OR REPLACE FUNCTION update_group_funds()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups
  SET total_funds = (
    SELECT COALESCE(SUM(amount), 0)
    FROM contributions
    WHERE group_id = NEW.group_id AND verified = TRUE
  )
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_funds
AFTER INSERT OR UPDATE OR DELETE ON contributions
FOR EACH ROW
EXECUTE FUNCTION update_group_funds();

CREATE OR REPLACE FUNCTION check_budget_approval()
RETURNS TRIGGER AS $$
DECLARE
  total_members INTEGER;
  approve_count INTEGER;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT COUNT(*) INTO total_members
    FROM group_members
    WHERE group_id = NEW.group_id;
    SELECT COUNT(*) INTO approve_count
    FROM budget_votes
    WHERE budget_id = NEW.id AND vote = 'approve';
    IF approve_count <= (total_members / 2) THEN
      RAISE EXCEPTION 'El presupuesto no tiene suficientes votos para aprobación';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_approval
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION check_budget_approval();

-- 4. FUNCIONES DE NEGOCIO

-- Resumen de grupos para un usuario
CREATE OR REPLACE FUNCTION get_groups_summary(p_user_id int)
RETURNS TABLE (
  id int,
  name varchar,
  description text,
  total_funds decimal,
  member_count bigint,
  active_budgets bigint,
  created_by_name varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id, 
    g.name, 
    g.description, 
    g.total_funds,
    count(distinct gm.user_id) as member_count,
    count(distinct b.id) filter (where b.status = 'approved') as active_budgets,
    u.display_name as created_by
  FROM groups g
  LEFT JOIN group_members gm ON g.id = gm.group_id
  LEFT JOIN budgets b ON g.id = b.group_id
  JOIN users u ON g.created_by = u.id
  WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = p_user_id)
  GROUP BY g.id, u.display_name;
END;
$$ LANGUAGE plpgsql;

-- Obtener grupos por estado del usuario
CREATE OR REPLACE FUNCTION get_groups_by_user_status(p_user_id int, p_status varchar)
RETURNS TABLE (
  id int,
  name varchar,
  description text,
  total_funds decimal,
  member_count bigint,
  active_budgets bigint,
  created_by_name varchar,
  user_status varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id, 
    g.name, 
    g.description, 
    g.total_funds,
    count(distinct gm2.user_id) filter (where gm2.status = 'active') as member_count,
    count(distinct b.id) filter (where b.status = 'approved') as active_budgets,
    u.display_name as created_by,
    gm.status as user_status
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = p_user_id
  LEFT JOIN group_members gm2 ON g.id = gm2.group_id
  LEFT JOIN budgets b ON g.id = b.group_id
  JOIN users u ON g.created_by = u.id
  WHERE gm.user_id = p_user_id AND gm.status = p_status
  GROUP BY g.id, u.display_name, gm.status;
END;
$$ LANGUAGE plpgsql;

-- Obtener presupuestos de un grupo
DROP FUNCTION IF EXISTS get_budgets_for_group(INTEGER);
CREATE OR REPLACE FUNCTION get_budgets_for_group(p_group_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR,
  description TEXT,
  objective VARCHAR,
  amount DECIMAL,
  group_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMPTZ,
  approve_votes BIGINT,
  reject_votes BIGINT,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.description,
    b.objective,
    b.amount,
    b.group_id,
    b.created_by,
    b.created_at,
    COALESCE(approve_count.count, 0) as approve_votes,
    COALESCE(reject_count.count, 0) as reject_votes,
    b.status
  FROM budgets b
  LEFT JOIN (
    SELECT budget_id, COUNT(*) as count
    FROM budget_votes
    WHERE vote = 'approve'
    GROUP BY budget_id
  ) approve_count ON b.id = approve_count.budget_id
  LEFT JOIN (
    SELECT budget_id, COUNT(*) as count
    FROM budget_votes
    WHERE vote = 'reject'
    GROUP BY budget_id
  ) reject_count ON b.id = reject_count.budget_id
  WHERE b.group_id = p_group_id
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Crear presupuesto
CREATE OR REPLACE FUNCTION create_budget(
  p_title VARCHAR,
  p_objective VARCHAR,
  p_amount DECIMAL,
  p_group_id INTEGER,
  p_created_by INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  new_budget_id INTEGER;
BEGIN
  INSERT INTO budgets (title, objective, amount, group_id, created_by, status)
  VALUES (p_title, p_objective, p_amount, p_group_id, p_created_by, 'draft')
  RETURNING id INTO new_budget_id;
  RETURN new_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Votar presupuesto (con actualización automática de estado)
CREATE OR REPLACE FUNCTION vote_on_budget(
  p_budget_id INTEGER,
  p_user_id INTEGER,
  p_vote VARCHAR
)
RETURNS void AS $$
DECLARE
  budget_group_id INTEGER;
  total_members INTEGER;
  approve_count INTEGER;
  reject_count INTEGER;
  current_status VARCHAR;
BEGIN
  SELECT b.group_id, b.status INTO budget_group_id, current_status
  FROM budgets b
  WHERE b.id = p_budget_id;
  IF budget_group_id IS NULL THEN
    RAISE EXCEPTION 'Presupuesto no encontrado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = budget_group_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Solo los miembros del grupo pueden votar';
  END IF;
  IF current_status != 'pending' THEN
    RAISE EXCEPTION 'Solo se puede votar en presupuestos en estado de votación';
  END IF;
  INSERT INTO budget_votes (budget_id, user_id, vote)
  VALUES (p_budget_id, p_user_id, p_vote)
  ON CONFLICT (budget_id, user_id)
  DO UPDATE SET vote = p_vote, voted_at = CURRENT_TIMESTAMP;
  SELECT COUNT(*) INTO total_members
  FROM group_members
  WHERE group_id = budget_group_id;
  SELECT COUNT(*) INTO approve_count
  FROM budget_votes
  WHERE budget_id = p_budget_id AND vote = 'approve';
  SELECT COUNT(*) INTO reject_count
  FROM budget_votes
  WHERE budget_id = p_budget_id AND vote = 'reject';
  IF approve_count > (total_members / 2) THEN
    UPDATE budgets SET status = 'approved' WHERE id = p_budget_id;
  ELSIF reject_count > (total_members / 2) THEN
    UPDATE budgets SET status = 'rejected' WHERE id = p_budget_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Votar presupuesto con comentario
CREATE OR REPLACE FUNCTION vote_on_budget_with_comment(
  p_budget_id INTEGER,
  p_user_id INTEGER,
  p_vote VARCHAR,
  p_comment TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO budget_votes (budget_id, user_id, vote, comment)
  VALUES (p_budget_id, p_user_id, p_vote, p_comment)
  ON CONFLICT (budget_id, user_id)
  DO UPDATE SET 
    vote = p_vote, 
    comment = p_comment,
    voted_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Adjuntar archivo a presupuesto
CREATE OR REPLACE FUNCTION add_budget_attachment(
  p_budget_id INTEGER,
  p_type VARCHAR,
  p_url VARCHAR
)
RETURNS void AS $$
BEGIN
  INSERT INTO budget_attachments (budget_id, type, url)
  VALUES (p_budget_id, p_type, p_url);
END;
$$ LANGUAGE plpgsql;

-- Crear grupo
CREATE OR REPLACE FUNCTION create_group(
  p_name VARCHAR,
  p_description TEXT,
  p_created_by INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  new_group_id INTEGER;
BEGIN
  INSERT INTO groups (name, description, created_by)
  VALUES (p_name, p_description, p_created_by)
  RETURNING id INTO new_group_id;
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (new_group_id, p_created_by, 'admin');
  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql;

-- Generar código de invitación
CREATE OR REPLACE FUNCTION generate_invite_code(p_group_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  current_code TEXT;
BEGIN
  SELECT invite_code INTO current_code FROM groups WHERE id = p_group_id;
  IF current_code IS NOT NULL AND current_code <> '' THEN
    RETURN current_code;
  END IF;
  LOOP
    new_code := (
      SELECT string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'::text, (floor(random() * 36)+1)::integer, 1), '')
      FROM generate_series(1, 6)
    );
    SELECT EXISTS(SELECT 1 FROM groups WHERE invite_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  UPDATE groups SET invite_code = new_code WHERE id = p_group_id;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Unirse a grupo con código
CREATE OR REPLACE FUNCTION join_group_with_code(p_user_id INTEGER, p_invite_code TEXT)
RETURNS INTEGER AS $$
DECLARE
  target_group_id INTEGER;
BEGIN
  SELECT id INTO target_group_id FROM groups WHERE invite_code = p_invite_code;
  IF target_group_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido';
  END IF;
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (target_group_id, p_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN target_group_id;
END;
$$ LANGUAGE plpgsql;

-- Cambiar estado de presupuesto
CREATE OR REPLACE FUNCTION update_budget_status(
  p_budget_id INTEGER,
  p_new_status VARCHAR,
  p_user_id INTEGER
)
RETURNS void AS $$
DECLARE
  budget_group_id INTEGER;
  user_role VARCHAR;
BEGIN
  SELECT b.group_id INTO budget_group_id
  FROM budgets b
  WHERE b.id = p_budget_id;
  SELECT gm.role INTO user_role
  FROM group_members gm
  WHERE gm.group_id = budget_group_id AND gm.user_id = p_user_id;
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar el estado del presupuesto';
  END IF;
  UPDATE budgets 
  SET status = p_new_status
  WHERE id = p_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Cambiar estado de grupo
CREATE OR REPLACE FUNCTION update_group_status(
  p_group_id INTEGER,
  p_new_status VARCHAR,
  p_user_id INTEGER
)
RETURNS void AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no es miembro del grupo';
  END IF;
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar el estado del grupo';
  END IF;
  UPDATE groups 
  SET status = p_new_status
  WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql;

-- Cambiar estado de usuario en grupo
CREATE OR REPLACE FUNCTION update_user_group_status(
  p_group_id INTEGER,
  p_user_id INTEGER,
  p_new_status VARCHAR
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no es miembro del grupo';
  END IF;
  IF p_new_status NOT IN ('active', 'archived', 'left') THEN
    RAISE EXCEPTION 'Estado inválido. Debe ser: active, archived, o left';
  END IF;
  UPDATE group_members 
  SET status = p_new_status
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. MIGRACIONES Y ACTUALIZACIONES (opcional, solo si es necesario para producción)
-- Actualizar los total_funds en grupos basado en las contribuciones verificadas
UPDATE groups SET total_funds = (
  SELECT COALESCE(SUM(amount), 0)
  FROM contributions
  WHERE group_id = groups.id AND verified = TRUE
);
-- Actualizar actual_spent en presupuestos basado en gastos aprobados
UPDATE budgets SET actual_spent = (
  SELECT COALESCE(SUM(amount), 0)
  FROM expenses
  WHERE budget_id = budgets.id AND approved = TRUE
);
-- Actualizar registros existentes de group_members para que tengan status 'active' por defecto
UPDATE group_members SET status = 'active' WHERE status IS NULL;

-- =============================
-- FIN DEL ESQUEMA UNIFICADO
-- ============================= 