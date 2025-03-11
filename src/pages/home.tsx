import { AppLayout } from '../components/layout'

export function Home() {
  return (
    <AppLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome to the Dashboard</h1>
        <p className="text-gray-600">
          This is your home page. You can add your dashboard content here.
        </p>
      </div>
    </AppLayout>
  );
} 