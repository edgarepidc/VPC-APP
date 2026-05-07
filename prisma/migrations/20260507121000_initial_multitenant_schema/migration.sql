create extension if not exists "pgcrypto";

create table if not exists "Tenant" (
  "id" text primary key default gen_random_uuid()::text,
  "name" text not null,
  "slug" text not null unique,
  "plan" text not null default 'starter',
  "createdAt" timestamptz not null default now()
);

create table if not exists "User" (
  "id" text primary key default gen_random_uuid()::text,
  "email" text not null unique,
  "name" text,
  "passwordHash" text,
  "isActive" boolean not null default true,
  "createdAt" timestamptz not null default now()
);

create table if not exists "Role" (
  "id" text primary key default gen_random_uuid()::text,
  "tenantId" text not null references "Tenant"("id") on delete cascade,
  "key" text not null,
  "name" text not null,
  unique("tenantId", "key")
);

create table if not exists "Permission" (
  "id" text primary key default gen_random_uuid()::text,
  "key" text not null unique,
  "description" text
);

create table if not exists "Membership" (
  "id" text primary key default gen_random_uuid()::text,
  "tenantId" text not null references "Tenant"("id") on delete cascade,
  "userId" text not null references "User"("id") on delete cascade,
  "roleId" text not null references "Role"("id"),
  "status" text not null default 'active',
  unique("tenantId", "userId")
);

create table if not exists "RolePermission" (
  "roleId" text not null references "Role"("id") on delete cascade,
  "permissionId" text not null references "Permission"("id") on delete cascade,
  primary key("roleId", "permissionId")
);

create table if not exists "Project" (
  "id" text primary key default gen_random_uuid()::text,
  "tenantId" text not null references "Tenant"("id") on delete cascade,
  "name" text not null,
  "description" text,
  "status" text not null default 'active',
  "createdBy" text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists "Task" (
  "id" text primary key default gen_random_uuid()::text,
  "tenantId" text not null references "Tenant"("id") on delete cascade,
  "projectId" text not null references "Project"("id") on delete cascade,
  "title" text not null,
  "status" text not null default 'todo',
  "assigneeUserId" text,
  "dueDate" timestamptz,
  "createdAt" timestamptz not null default now()
);

create index if not exists "idx_project_tenant" on "Project"("tenantId");
create index if not exists "idx_task_tenant" on "Task"("tenantId");
create index if not exists "idx_task_project" on "Task"("projectId");
