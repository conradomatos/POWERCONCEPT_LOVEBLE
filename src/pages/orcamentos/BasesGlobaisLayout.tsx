import { Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';

export default function BasesGlobaisLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
