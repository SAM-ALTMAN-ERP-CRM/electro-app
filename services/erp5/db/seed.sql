-- Database seed for ERP5 (6 demo users, password = demo123)
-- Hashed using PBKDF2-SHA256 (Node built-in crypto, 310000 iterations)
-- Format: pbkdf2:<salt>:<hex-hash>
INSERT INTO users (id, name, email, password_hash, role, employee_id, active)
VALUES
  ('USR-0001','System Administrator','admin@demo.com',
   'pbkdf2:electro5salt0001:eb3bcf3730db6983b507acb4f8f62b25580c0bc945baeae8a43867c740fe6bfd',
   'admin','EMP-0012',true),

  ('USR-0002','Rohan Kulkarni','sales@demo.com',
   'pbkdf2:electro5salt0002:1e4cf698b0995fbf3308635a58d664172c08df4c5a165afa42fe4a9739e36c80',
   'sales','EMP-0001',true),

  ('USR-0003','Support Agent','support@demo.com',
   'pbkdf2:electro5salt0003:305662f676b53048a4ca1b2b31c4a3b4edd5c63ae8688a8d51760a5a9f94dc1b',
   'support',NULL,true),

  ('USR-0004','Warehouse Manager','warehouse@demo.com',
   'pbkdf2:electro5salt0004:61c44c1d7ff0dcd08a7dfb65036951a5fc19795bc1ed76ba175f9281bb84fdac',
   'warehouse',NULL,true),

  ('USR-0005','Finance Manager','finance@demo.com',
   'pbkdf2:electro5salt0005:9a0084684ad1f51d4761aea553bc9f73c447bc66531b06745460504f2ff0cb32',
   'finance','EMP-0010',true),

  ('USR-0006','HR Manager','hr@demo.com',
   'pbkdf2:electro5salt0006:9dbbda31a8a5a1f60e296b0b2a8f960b545bb81136d89b2b54a0b929923dd870',
   'hr','EMP-0008',true)
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),0) FROM users));
