// La escena 3D (Three.js) pesa bastante, así que se descarga aparte.
// Personalizar la pide por adelantado para que esté lista al pulsar "Crear isla".
export const loadBoard3D = () => import('../three/Board3D');
