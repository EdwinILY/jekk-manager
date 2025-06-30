-- Script para insertar datos de ejemplo (opcional)
-- Ejecutar después de configurar la base de datos y sincronizar usuarios

-- Insertar grupos de ejemplo (reemplaza 'your-user-id' con un ID real de tu tabla users)
INSERT INTO groups (name, description, created_by, invite_code, total_funds)
VALUES 
  ('Familia', 'Gastos familiares compartidos', 1, 'FAM001', 5000.00),
  ('Trabajo', 'Gastos del equipo de trabajo', 1, 'WRK001', 3000.00),
  ('Amigos', 'Gastos grupales con amigos', 1, 'FRD001', 2000.00);

-- Agregar membresías de grupo (reemplaza con IDs reales)
INSERT INTO group_members (group_id, user_id, role)
VALUES 
  (1, 1, 'admin'),
  (2, 1, 'admin'),
  (3, 1, 'admin');

-- Insertar presupuestos de ejemplo
INSERT INTO budgets (group_id, title, description, objective, amount, status, created_by, target_date)
VALUES 
  (1, 'Compras del mes', 'Supermercado y productos básicos', 'Alimentación familiar', 1500.00, 'approved', 1, '2024-07-31'),
  (1, 'Servicios públicos', 'Electricidad, agua, gas', 'Servicios básicos del hogar', 800.00, 'approved', 1, '2024-07-31'),
  (2, 'Material de oficina', 'Suministros para el equipo', 'Productividad laboral', 500.00, 'approved', 1, '2024-07-31'),
  (3, 'Salida de fin de semana', 'Actividades grupales', 'Entretenimiento y recreación', 600.00, 'pending', 1, '2024-07-31');

-- Insertar gastos de ejemplo
INSERT INTO expenses (budget_id, group_id, amount, description, category, paid_by, approved)
VALUES 
  (1, 1, 250.00, 'Compra en supermercado', 'Alimentación', 1, true),
  (1, 1, 150.00, 'Verduras y frutas', 'Alimentación', 1, true),
  (1, 1, 80.00, 'Productos de limpieza', 'Hogar', 1, true),
  (2, 1, 120.00, 'Factura de electricidad', 'Servicios', 1, true),
  (2, 1, 60.00, 'Factura de agua', 'Servicios', 1, true),
  (3, 2, 85.00, 'Papel y bolígrafos', 'Oficina', 1, true),
  (3, 2, 45.00, 'Carpetas y archivadores', 'Oficina', 1, true),
  (4, 3, 200.00, 'Entrada al parque temático', 'Entretenimiento', 1, false);

-- Insertar contribuciones de ejemplo
INSERT INTO contributions (group_id, user_id, amount, budget_id, payment_method, verified)
VALUES 
  (1, 1, 2000.00, 1, 'transferencia', true),
  (1, 1, 1500.00, 2, 'efectivo', true),
  (2, 1, 1000.00, 3, 'transferencia', true),
  (3, 1, 800.00, 4, 'efectivo', false);

-- Insertar votos de presupuestos
INSERT INTO budget_votes (budget_id, user_id, vote, comment)
VALUES 
  (1, 1, 'approve', 'Necesario para el hogar'),
  (2, 1, 'approve', 'Gastos esenciales'),
  (3, 1, 'approve', 'Necesario para el trabajo'),
  (4, 1, 'approve', 'Buena idea para el grupo');

-- Actualizar el total de fondos gastados en los presupuestos
UPDATE budgets 
SET actual_spent = (
  SELECT COALESCE(SUM(amount), 0) 
  FROM expenses 
  WHERE expenses.budget_id = budgets.id AND expenses.approved = true
);

-- Actualizar el total de fondos de los grupos
UPDATE groups 
SET total_funds = (
  SELECT COALESCE(SUM(amount), 0) 
  FROM contributions 
  WHERE contributions.group_id = groups.id AND contributions.verified = true
);
