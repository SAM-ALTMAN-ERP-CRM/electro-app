-- Database seed for ERP5 (6 demo users, password = demo123)
INSERT INTO users (id, name, email, password_hash, role, employee_id, active)
VALUES
  ('USR-0001','System Administrator','admin@demo.com','$2b$10$TwGxuT4TU/cGoBeHhk/WX.Z7Z8pQk6/oclJ.OW3.F2N3AD1Aaz7Nq','admin','EMP-0012',true),
  ('USR-0002','Rohan Kulkarni','sales@demo.com','$2b$10$TwGxuT4TU/cGoBeHhk/WX.Z7Z8pQk6/oclJ.OW3.F2N3AD1Aaz7Nq','sales','EMP-0001',true),
  ('USR-0003','Support Agent','support@demo.com','$2b$10$TwGxuT4TU/cGoBeHhk/WX.Z7Z8pQk6/oclJ.OW3.F2N3AD1Aaz7Nq','support',NULL,true),
  ('USR-0004','Warehouse Manager','warehouse@demo.com','$2b$10$TwGxuT4TU/cGoBeHhk/WX.Z7Z8pQk6/oclJ.OW3.F2N3AD1Aaz7Nq','warehouse',NULL,true),
  ('USR-0005','Finance Manager','finance@demo.com','$2b$10$TwGxuT4TU/cGoBeHhk/WX.Z7Z8pQk6/oclJ.OW3.F2N3AD1Aaz7Nq','finance','EMP-0010',true),
  ('USR-0006','HR Manager','hr@demo.com','$2b$10$TwGxuT4TU/cGoBeHhk/WX.Z7Z8pQk6/oclJ.OW3.F2N3AD1Aaz7Nq','hr','EMP-0008',true)
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),0) FROM users));
