# Release Readiness (Subdominio)

## Pre-deploy

- [ ] Definir `NEXT_PUBLIC_APP_URL` con origen final HTTPS (ejemplo: `https://app.tudominio.com`).
- [ ] Confirmar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL`.
- [ ] En Supabase Auth, registrar `Site URL` y `Redirect URLs` del subdominio.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run build`.

## Smoke Test Funcional

- [ ] Auth: `signup/login/logout` funciona en el subdominio.
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

## Post-deploy

- [ ] Validar flujo completo end-to-end en produccion.
- [ ] Revisar logs de errores en las primeras 24h.
- [ ] Confirmar envio de invitaciones en entorno real.
