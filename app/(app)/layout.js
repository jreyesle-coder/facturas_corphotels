import Nav from '../../components/Nav';
import { getUserRole } from '../../lib/getUser';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const { user, role, configured } = await getUserRole();
  return (
    <>
      <Nav email={user?.email || null} role={role} configured={configured} />
      {children}
    </>
  );
}
