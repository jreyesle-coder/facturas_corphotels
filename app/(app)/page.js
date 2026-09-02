import DashboardComparacion from '../../components/DashboardComparacion';
import { getInvoices } from '../../lib/getInvoices';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { invoices, configured, error } = await getInvoices();
  return <DashboardComparacion invoices={invoices} configured={configured} error={error} />;
}
