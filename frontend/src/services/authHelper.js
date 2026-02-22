// Helper para determinar el rol del usuario basado en las credenciales
export const getUserRole = () => {
  // Primero intentar obtener desde localStorage (después del login)
  const username = localStorage.getItem('username');
  
  if (username) {
    return username === 'admin' ? 'ADMIN' : 'SUPERVISOR';
  }
  
  // Si no hay en localStorage, usar las variables de entorno (por defecto)
  const envUsername = import.meta.env.VITE_API_USERNAME || 'admin';
  return envUsername === 'admin' ? 'ADMIN' : 'SUPERVISOR';
};

export const isAdmin = () => {
  return getUserRole() === 'ADMIN';
};

export const isSupervisor = () => {
  return getUserRole() === 'SUPERVISOR';
};
