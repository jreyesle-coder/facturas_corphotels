import Historial from '../../../components/Historial';
import { getInvoices } from '../../../lib/getInvoices';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { invoices, configured, error } = await getInvoices();
  return <Historial invoices={invoices} configured={configured} error={error} />;
}
