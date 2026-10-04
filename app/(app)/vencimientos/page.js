import Vencimientos from '../../../components/Vencimientos';
import { getInvoices } from '../../../lib/getInvoices';
import { getUserRole } from '../../../lib/getUser';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { invoices, configured, error } = await getInvoices();
  const { role } = await getUserRole();
  return <Vencimientos invoices={invoices} configured={configured} error={error} role={role} />;
}
