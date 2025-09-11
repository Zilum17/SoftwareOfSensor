import express from 'express';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
const app = express()
app.use(morgan('dev'));

function formatearFechaISO12H(timestampISO) {
    const fecha = new Date(timestampISO);
    
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    
    let horas = fecha.getHours();
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12;
    horas = horas ? horas : 12;
    horas = String(horas).padStart(2, '0');
    
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    const segundos = String(fecha.getSeconds()).padStart(2, '0');
    
    return `${año}/${mes}/${dia} - ${horas}:${minutos}:${segundos} ${ampm}`;
}

// Middleware para parsear JSON y servir archivos estáticos
app.use(express.json());
app.use(express.static('../client/public'));

// Almacenar mediciones y distancia de activación
let measurements = [];
let activationDistance = 20.0; // Valor inicial (cm) del umbral

// Configurar WebSocket
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', ws => {
  // Enviar estado actual al conectar
  ws.send(JSON.stringify({ measurements, activationDistance }));
});

// Ruta para recibir la distancia del objeto detectado del ESP32
app.post('/distance', (req, res) => {
  const { distance } = req.body;
  if (distance !== undefined) {
    const timestamp = new Date().toISOString();
    measurements.push({ timestamp: formatearFechaISO12H(timestamp), distance });
    // Mantener solo las últimas 50 mediciones
    if (measurements.length > 50) measurements.shift();
    console.log(`Recibido: Distancia = ${distance} cm`);
    // Enviar actualización a todos los clientes WebSocket
    const message = JSON.stringify({ measurements, activationDistance });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    res.status(200).send();
  } else {
    res.status(400).send();
  }
});

// Ruta para obtener la distancia de activación
app.get('/activation-distance', (req, res) => {
  res.send(String(activationDistance));
});

// Ruta para actualizar la distancia de activación desde la web
app.post('/set-activation-distance', (req, res) => {
  const { distance } = req.body;
  if (distance !== undefined && !isNaN(distance) && distance > 0) {
    activationDistance = parseFloat(distance);
    console.log(`Nueva distancia de activación: ${activationDistance} cm`);
    // Notificar a los clientes WebSocket
    const message = JSON.stringify({ measurements, activationDistance });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    res.status(200).send();
  } else {
    res.status(400).send();
  }
});

// Ruta para enviar datos a la web (mediciones y umbral)
app.get('/get-data', (req, res) => {
  res.json({ measurements, activationDistance });
});
export default app;