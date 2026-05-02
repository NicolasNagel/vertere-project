import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPapel } from '../types';

interface Props {
  children: React.ReactNode;
  roles?: UserPapel[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.papel)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
