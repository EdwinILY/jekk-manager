create or replace function get_groups_summary(p_user_id int)
returns table (
  id int,
  name varchar,
  description text,
  total_funds decimal,
  member_count bigint,
  active_budgets bigint,
  created_by_name varchar
) as $$
begin
  return query
  select 
    g.id, 
    g.name, 
    g.description, 
    g.total_funds,
    count(distinct gm.user_id) as member_count,
    count(distinct b.id) filter (where b.status = 'approved') as active_budgets,
    u.display_name as created_by
  from groups g
  left join group_members gm on g.id = gm.group_id
  left join budgets b on g.id = b.group_id
  join users u on g.created_by = u.id
  where g.id in (select group_id from group_members where user_id = p_user_id)
  group by g.id, u.display_name;
end;
$$ language plpgsql;

DROP FUNCTION IF EXISTS get_budgets_for_group(integer);
CREATE OR REPLACE FUNCTION get_budgets_for_group(p_group_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR,
  objective TEXT,
  amount DECIMAL,
  group_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP,
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

DROP FUNCTION IF EXISTS create_budget(character varying, text, numeric, integer, integer);
CREATE OR REPLACE FUNCTION create_budget(
  p_title VARCHAR,
  p_objective TEXT,
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

CREATE OR REPLACE FUNCTION vote_on_budget(
  p_budget_id INTEGER,
  p_user_id INTEGER,
  p_vote VARCHAR
)
RETURNS void AS $$
BEGIN
  INSERT INTO budget_votes (budget_id, user_id, vote)
  VALUES (p_budget_id, p_user_id, p_vote)
  ON CONFLICT (budget_id, user_id)
  DO UPDATE SET vote = p_vote, voted_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

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

CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  objective TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'executing', 'completed'))
); 