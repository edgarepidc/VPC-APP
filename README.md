## EMBUS SaaS Multitenant

Plataforma SaaS multitenant para gestion PMO con Next.js + Prisma + Supabase.

Incluye:
- Base `Next.js + TypeScript + Tailwind`
- Auth SSR real con Supabase (`login/signup/logout`)
- Flujo `login -> seleccion de tenant -> dashboard`
- RBAC por rol (`owner/admin/manager/member`)
- RLS en tablas core + acceso por `tenant_id`
- Modulos PMO: projects, tasks, deliverables, risks, stakeholders, members, dashboard consolidado
- Integracion activa con PostgreSQL via `Prisma Client`

## Getting Started

1) Instala dependencias:

```bash
npm install
```

2) Variables de entorno:

```bash
cp .env.example .env
```

3) Genera cliente, migra y carga seed:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4) Levanta el servidor:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Flujo demo recomendado:
1. `/login`
2. `/select-tenant`
3. `/dashboard/projects` o `/dashboard/tasks`

## API demo

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/tasks`
- `POST /api/tasks`

Todos los endpoints toman el tenant activo desde cookie de sesion y aplican permisos por rol.

## Validacion final para subdominio

Checklist recomendado antes de deploy:

1. Definir `NEXT_PUBLIC_APP_URL` con el origen final, por ejemplo `https://app.tudominio.com`.
2. En Supabase Auth, agregar `Site URL` y `Redirect URLs` para ese subdominio.
3. Verificar cookies de sesion en HTTPS y dominio correcto.
4. Validar flujo completo: `login -> select-tenant -> dashboard -> logout`.
5. Probar invitaciones de miembros y confirmar que el email redirige a `${NEXT_PUBLIC_APP_URL}/login`.
6. Confirmar politicas RLS con usuario de tenant A intentando acceder a recursos de tenant B.

Checklist detallado de release: `RELEASE_CHECKLIST.md`.

## Prisma

Cuando tengas PostgreSQL listo:

```bash
npm run prisma:generate
npm run prisma:migrate
```
