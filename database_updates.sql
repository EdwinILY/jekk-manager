-- Actualizaciones para la gestión del ciclo de vida de presupuestos

-- Añadir campo status a la tabla budgets si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'budgets' AND column_name = 'status') THEN
        ALTER TABLE budgets ADD COLUMN status VARCHAR DEFAULT 'draft';
        ALTER TABLE budgets ADD CONSTRAINT check_status 
            CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'executing', 'completed'));
    END IF;
END $$;

-- Eliminar funciones existentes antes de recrearlas
DROP FUNCTION IF EXISTS get_budgets_for_group(integer);
DROP FUNCTION IF EXISTS create_budget(character varying, text, numeric, integer, integer);
DROP FUNCTION IF EXISTS vote_on_budget(integer, integer, character varying);

-- Recrear función get_budgets_for_group con el campo status
CREATE OR REPLACE FUNCTION get_budgets_for_group(p_group_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR,
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

-- Recrear función create_budget con el campo status
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

-- Función mejorada para votar con aprobación automática
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
  -- Obtener el grupo del presupuesto y verificar que el usuario es miembro
  SELECT b.group_id, b.status INTO budget_group_id, current_status
  FROM budgets b
  WHERE b.id = p_budget_id;
  
  IF budget_group_id IS NULL THEN
    RAISE EXCEPTION 'Presupuesto no encontrado';
  END IF;
  
  -- Verificar que el usuario es miembro del grupo
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = budget_group_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Solo los miembros del grupo pueden votar';
  END IF;
  
  -- Verificar que el presupuesto está en estado de votación
  IF current_status != 'pending' THEN
    RAISE EXCEPTION 'Solo se puede votar en presupuestos en estado de votación';
  END IF;
  
  -- Registrar o actualizar el voto
  INSERT INTO budget_votes (budget_id, user_id, vote)
  VALUES (p_budget_id, p_user_id, p_vote)
  ON CONFLICT (budget_id, user_id)
  DO UPDATE SET vote = p_vote, voted_at = CURRENT_TIMESTAMP;
  
  -- Verificar si se debe aprobar automáticamente
  SELECT COUNT(*) INTO total_members
  FROM group_members
  WHERE group_id = budget_group_id;
  
  SELECT COUNT(*) INTO approve_count
  FROM budget_votes
  WHERE budget_id = p_budget_id AND vote = 'approve';
  
  SELECT COUNT(*) INTO reject_count
  FROM budget_votes
  WHERE budget_id = p_budget_id AND vote = 'reject';
  
  -- Aprobar automáticamente si hay mayoría de votos a favor
  IF approve_count > (total_members / 2) THEN
    UPDATE budgets SET status = 'approved' WHERE id = p_budget_id;
  -- Rechazar automáticamente si hay mayoría de votos en contra
  ELSIF reject_count > (total_members / 2) THEN
    UPDATE budgets SET status = 'rejected' WHERE id = p_budget_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el estado del presupuesto
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
  -- Verificar que el usuario es admin del grupo
  SELECT b.group_id INTO budget_group_id
  FROM budgets b
  WHERE b.id = p_budget_id;
  
  SELECT gm.role INTO user_role
  FROM group_members gm
  WHERE gm.group_id = budget_group_id AND gm.user_id = p_user_id;
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar el estado del presupuesto';
  END IF;
  
  -- Actualizar el estado
  UPDATE budgets 
  SET status = p_new_status
  WHERE id = p_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Función para crear grupos
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
  
  -- Automáticamente añadir al creador como miembro admin del grupo
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (new_group_id, p_created_by, 'admin');
  
  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql;

-- Función para votar con comentarios
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