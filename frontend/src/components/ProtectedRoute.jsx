import { Navigate } from 'react-router-dom';

export const isAuthenticated = () => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

export const logout = () => {
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('username');
};

export const getUsername = () => {
  return localStorage.getItem('username') || '';
};

export function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
