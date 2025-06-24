CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  photo_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  qr_code VARCHAR(255), -- URL del código QR
  invite_code VARCHAR(20) UNIQUE, -- Código de invitación
  total_funds DECIMAL(12, 2) DEFAULT 0
);

CREATE TABLE group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  objective VARCHAR(255) NOT NULL, -- Objetivo del gasto
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'executing', 'completed', 'cancelled')) DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  target_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  actual_spent DECIMAL(12, 2) DEFAULT 0,
  execution_comments TEXT
);

CREATE TABLE budget_attachments (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('image', 'quote', 'link')),
  url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_responsibles (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(budget_id, user_id)
);

CREATE TABLE budget_votes (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(10) CHECK (vote IN ('approve', 'reject', 'abstain')),
  comment TEXT,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(budget_id, user_id)
);

CREATE TABLE contributions (
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

CREATE TABLE expenses (
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

-- Índices para mejorar el rendimiento de búsquedas comunes
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_budgets_group ON budgets(group_id);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_contributions_group_user ON contributions(group_id, user_id);
CREATE INDEX idx_expenses_budget ON expenses(budget_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);

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
    -- Obtener número total de miembros del grupo
    SELECT COUNT(*) INTO total_members
    FROM group_members
    WHERE group_id = NEW.group_id;
    
    -- Obtener número de votos a favor
    SELECT COUNT(*) INTO approve_count
    FROM budget_votes
    WHERE budget_id = NEW.id AND vote = 'approve';
    
    -- Verificar si alcanza mayoría simple
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
)
WHERE id IN (1, 3, 5, 6);

