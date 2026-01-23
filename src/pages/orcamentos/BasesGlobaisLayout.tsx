import { Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';

export default function BasesGlobaisLayout() {
  return (
    <Layout>
      <div className="flex-1">
        <Outlet />
      </div>
    </Layout>
  );
}
