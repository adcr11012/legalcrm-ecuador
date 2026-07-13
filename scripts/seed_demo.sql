-- Script de una sola vez para poblar el workspace de demo "Estudio Jurídico Demo"
-- (cuenta demo.tsadoq2@gmail.com) con datos realistas para tomar capturas del manual.
-- No es una migración, no se aplica al esquema — solo datos.

do $$
declare
  v_ws_id uuid;
  v_user_id uuid;
  v_cliente_maria uuid;
  v_cliente_constructora uuid;
  v_cliente_roberto uuid;
  v_etapa_nuevo uuid;
  v_etapa_activo uuid;
  v_etapa_espera uuid;
  v_etapa_audiencia uuid;
  v_etapa_resuelto uuid;
  v_etapa_archivado uuid;
  v_caso1 uuid;
  v_caso2 uuid;
  v_caso3 uuid;
  v_caso4 uuid;
begin
  select w.id, u.id into v_ws_id, v_user_id
  from workspaces w
  join users u on u.workspace_id = w.id
  join auth.users au on au.id = u.id
  where au.email = 'demo.tsadoq2@gmail.com';

  if v_ws_id is null then
    raise exception 'No se encontró el workspace de demo.tsadoq2@gmail.com';
  end if;

  select id into v_cliente_maria from clientes where workspace_id = v_ws_id and nombre = 'María Fernanda Torres';
  select id into v_cliente_constructora from clientes where workspace_id = v_ws_id and nombre = 'Constructora Andina S.A.';
  select id into v_cliente_roberto from clientes where workspace_id = v_ws_id and nombre = 'Roberto Vaca Espinoza';

  -- Etapas por defecto (el workspace no las tenía — bug real, ver aparte)
  if not exists (select 1 from etapas where workspace_id = v_ws_id) then
    insert into etapas (workspace_id, nombre, color, es_terminal, posicion) values
      (v_ws_id, 'Nuevo', 'neutral', false, 1),
      (v_ws_id, 'Activo', 'accent', false, 2),
      (v_ws_id, 'En espera', 'warn', false, 3),
      (v_ws_id, 'Audiencia próxima', 'danger', false, 4),
      (v_ws_id, 'Resuelto', 'success', true, 5),
      (v_ws_id, 'Archivado', 'neutral', true, 6);
  end if;

  select id into v_etapa_nuevo from etapas where workspace_id = v_ws_id and nombre = 'Nuevo';
  select id into v_etapa_activo from etapas where workspace_id = v_ws_id and nombre = 'Activo';
  select id into v_etapa_espera from etapas where workspace_id = v_ws_id and nombre = 'En espera';
  select id into v_etapa_audiencia from etapas where workspace_id = v_ws_id and nombre = 'Audiencia próxima';
  select id into v_etapa_resuelto from etapas where workspace_id = v_ws_id and nombre = 'Resuelto';
  select id into v_etapa_archivado from etapas where workspace_id = v_ws_id and nombre = 'Archivado';

  -- Casos
  insert into casos (workspace_id, titulo, materia, etapa_id, numero_causa, created_by, honorarios_tipo)
  values (v_ws_id, 'Despido intempestivo - María Fernanda Torres', 'laboral', v_etapa_audiencia, '17371-2026-01234', v_user_id, 'por_hora')
  returning id into v_caso1;

  insert into casos (workspace_id, titulo, materia, etapa_id, numero_causa, created_by, honorarios_tipo)
  values (v_ws_id, 'Cobro ejecutivo - Constructora Andina S.A.', 'civil', v_etapa_activo, '17371-2026-00891', v_user_id, 'fijo')
  returning id into v_caso2;

  insert into casos (workspace_id, titulo, materia, etapa_id, created_by, honorarios_tipo)
  values (v_ws_id, 'Divorcio por mutuo consentimiento - Vaca Espinoza', 'familia', v_etapa_nuevo, v_user_id, 'fijo')
  returning id into v_caso3;

  insert into casos (workspace_id, titulo, materia, etapa_id, created_by, honorarios_tipo, fecha_finalizado)
  values (v_ws_id, 'Asesoría contractual - Constructora Andina S.A.', 'mercantil', v_etapa_resuelto, v_user_id, 'fijo', now() - interval '10 days')
  returning id into v_caso4;

  -- Personas por caso (abogada + cliente). nombre_externo se rellena también
  -- para cumplir caso_personas_persona_check (constraint no contempla cliente_id).
  insert into caso_personas (caso_id, user_id, rol) values (v_caso1, v_user_id, 'abogado');
  insert into caso_personas (caso_id, cliente_id, nombre_externo, rol) values (v_caso1, v_cliente_maria, 'María Fernanda Torres', 'cliente');

  insert into caso_personas (caso_id, user_id, rol) values (v_caso2, v_user_id, 'abogado');
  insert into caso_personas (caso_id, cliente_id, nombre_externo, rol) values (v_caso2, v_cliente_constructora, 'Constructora Andina S.A.', 'cliente');

  insert into caso_personas (caso_id, user_id, rol) values (v_caso3, v_user_id, 'abogado');
  insert into caso_personas (caso_id, cliente_id, nombre_externo, rol) values (v_caso3, v_cliente_roberto, 'Roberto Vaca Espinoza', 'cliente');

  insert into caso_personas (caso_id, user_id, rol) values (v_caso4, v_user_id, 'abogado');
  insert into caso_personas (caso_id, cliente_id, nombre_externo, rol) values (v_caso4, v_cliente_constructora, 'Constructora Andina S.A.', 'cliente');

  -- Plazos / agenda
  insert into plazos (caso_id, workspace_id, titulo, descripcion, fecha, tipo, estado, asignado_a)
  values
    (v_caso1, v_ws_id, 'Audiencia de juicio', 'Audiencia única, Unidad Judicial del Trabajo', current_date + 12, 'audiencia', 'pendiente', v_user_id),
    (v_caso2, v_ws_id, 'Vencimiento término de prueba', 'Presentar pruebas de la obligación', current_date + 6, 'plazo', 'pendiente', v_user_id),
    (v_caso3, v_ws_id, 'Presentar demanda de divorcio', null, current_date + 3, 'plazo', 'pendiente', v_user_id);

  -- Tareas
  insert into tareas (workspace_id, caso_id, titulo, descripcion, asignado_a, fecha_limite, estado, created_by)
  values
    (v_ws_id, v_caso1, 'Preparar pliego de posiciones', 'Revisar hechos con la clienta antes de la audiencia', v_user_id, current_date + 8, 'pendiente', v_user_id),
    (v_ws_id, v_caso2, 'Calcular liquidación de intereses', null, v_user_id, current_date + 2, 'en_progreso', v_user_id);

  -- Comentario interno
  insert into caso_comentarios (caso_id, user_id, contenido)
  values (v_caso1, v_user_id, 'Cliente confirma disponibilidad para la audiencia. Se solicitó certificado de votación actualizado.');

  raise notice 'Listo: % casos, etapas y agenda creados en workspace %', 4, v_ws_id;
end $$;
