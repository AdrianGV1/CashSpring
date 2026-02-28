import { useState, useEffect } from 'react';

export default function RelojFecha() {
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const fecha = ahora.toLocaleDateString('es-CR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const hora = ahora.toLocaleTimeString('es-CR', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>
      {fecha} &nbsp;{hora}
    </span>
  );
}
