-- Unifica owner → admin: un solo rol administrador por organización.

UPDATE "Membership" m
SET "roleId" = admin_role.id
FROM "Role" owner_role
INNER JOIN "Role" admin_role
  ON admin_role."tenantId" = owner_role."tenantId"
  AND admin_role.key = 'admin'
WHERE m."roleId" = owner_role.id
  AND owner_role.key = 'owner';

UPDATE "Invitation"
SET "roleKey" = 'admin'
WHERE "roleKey" = 'owner';

DELETE FROM "RolePermission"
WHERE "roleId" IN (SELECT id FROM "Role" WHERE key = 'owner');

DELETE FROM "Role"
WHERE key = 'owner';
