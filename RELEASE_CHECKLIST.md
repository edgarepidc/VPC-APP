# Release Readiness (Subdominio)

## Pre-deploy

- [ ] Definir `NEXT_PUBLIC_APP_URL` con origen final HTTPS (ejemplo: `https://app.tudominio.com`).
- [ ] Confirmar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL`.
- [ ] **Migraciones:** tras cada cambio en `prisma/schema` o `prisma/migrations`, ejecutar `npx prisma migrate deploy` contra la base de producción (desde tu PC con `DATABASE_URL` del pooler o en CI con secret). El deploy en Vercel **no** aplica migraciones solo.
- [ ] **Consultora:** si usas la vista `/admin`, definir `PLATFORM_OWNER_EMAIL` (o `PLATFORM_SUPERADMIN_EMAILS`) en Vercel Production y redeploy.
- [ ] En Supabase Auth, registrar `Site URL` y `Redirect URLs` del subdominio.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run build` (el workflow de GitHub Actions hace lint + tsc + build en cada push a `main`).

## Consultora / gobernanza

- [ ] Los usuarios listados en `PLATFORM_OWNER_EMAIL` / `PLATFORM_SUPERADMIN_EMAILS` pueden entrar a cualquier tenant desde `/admin` sin invitación; dentro del dashboard verán el aviso **Modo consultora** si no tienen membresía en ese cliente.
- [ ] Acuerdo interno: quién puede tener ese correo en variables de entorno y cuándo usar “Entrar al workspace” frente a invitar como miembro formal.

## Demo / piloto

- [ ] Crear una organización de prueba (`/admin/tenants`), proyectos y un usuario invitado para validar el flujo con un cliente piloto.

## Smoke Test Funcional

- [ ] Auth: `signup/login/logout` funciona en el subdominio.
- [ ] Consultora: `/admin` lista tenants, busqueda, **Entrar al workspace**, banner **Modo consultora**; `/admin/tenants` post-creación **Entrar al workspace ahora**.
- [ ] Tenant: seleccion de tenant y persistencia de tenant activo.
- [ ] RBAC: owner/admin/manager/member ven solo acciones permitidas.
- [ ] Projects: listar y crear (si rol tiene permisos).
- [ ] Tasks: listar y crear (si rol tiene permisos).
- [ ] Deliverables: crear, listar y validar semaforo/estado.
- [ ] Risks: crear, listar y validar score/semaforo.
- [ ] Stakeholders: crear, listar y validar cuadrante/semaforo.
- [ ] Members: invitar por email y redireccion de invitacion a `${NEXT_PUBLIC_APP_URL}/login`.
- [ ] PMO Dashboard: KPIs, tablas y badges renderizan correctamente.

## Multi-tenant / Seguridad

- [ ] Usuario de tenant A no puede acceder ni listar recursos de tenant B.
- [ ] Endpoints API protegidos por sesion y tenant activo.
- [ ] Politicas RLS activas en tablas core.

## Plan SaaS (límites)

- [ ] Los números por plan viven en `src/modules/platform/plans.ts` (`PLAN_LIMITS`). Tras cambiarlos, redeploy.
- [ ] Crear proyecto y agregar miembro respetan el plan del tenant (`Tenant.plan`); la API `POST /api/projects` responde 403 si se supera el límite.

## Post-deploy

- [ ] Validar flujo completo end-to-end en produccion.
- [ ] Revisar logs de errores en las primeras 24h.
- [ ] Confirmar envio de invitaciones en entorno real.
