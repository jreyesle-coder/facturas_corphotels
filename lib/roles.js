// Roles de la app.
//  - gerencia:   solo ve los dashboards
//  - operador:   ve + carga facturas (asistentes administrativos)
//  - tecnologia: ve + carga facturas
//  - superuser:  acceso total (rol más alto)
export const WRITE_ROLES = ['operador', 'tecnologia', 'superuser'];

export function canWrite(role) {
  return WRITE_ROLES.includes(role);
}

export function roleLabel(role) {
  if (role === 'superuser') return 'Super usuario';
  if (role === 'tecnologia') return 'Tecnología';
  if (role === 'operador') return 'Operador';
  return 'Gerencia';
}

// Clase CSS del chip de rol en la barra.
export function roleChipClass(role) {
  if (role === 'superuser') return 'super';
  if (role === 'tecnologia') return 'tech';
  if (role === 'operador') return 'oper';
  return 'ger';
}
