// Roles de la app.
//  - gerencia:   solo ve los dashboards
//  - tecnologia: ve + carga facturas
//  - superuser:  acceso total (todo lo de tecnología; rol más alto)
export const WRITE_ROLES = ['tecnologia', 'superuser'];

export function canWrite(role) {
  return WRITE_ROLES.includes(role);
}

export function roleLabel(role) {
  if (role === 'superuser') return 'Super usuario';
  if (role === 'tecnologia') return 'Tecnología';
  return 'Gerencia';
}

// Clase CSS del chip de rol en la barra.
export function roleChipClass(role) {
  if (role === 'superuser') return 'super';
  if (role === 'tecnologia') return 'tech';
  return 'ger';
}
