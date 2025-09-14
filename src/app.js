import express from 'express';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';

const app = express();
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
let activationDistance = 20.0;

// Configurar WebSocket
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', ws => {
  console.log('Nuevo cliente WebSocket conectado');
  
  // Enviar estado actual al conectar
  ws.send(JSON.stringify({ 
    type: 'initial-data',
    measurements, 
    activationDistance 
  }));

  // Manejar mensajes entrantes del ESP32
  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      
      // Si el mensaje contiene distancia, procesarlo como el endpoint POST
      if (data.distance !== undefined) {
        const timestamp = new Date().toISOString();
        measurements.push({ 
          id: Date.now(), // Añadir ID único para cada medición
          timestamp: formatearFechaISO12H(timestamp), 
          distance: data.distance 
        });
        
        // Mantener solo las últimas 15 mediciones
        if (measurements.length > 15) {
          measurements.shift();
        }
        
        console.log(`Recibido por WS: Distancia = ${data.distance} cm`);
        
        // Enviar actualización a todos los clientes WebSocket
        const updateMessage = JSON.stringify({ 
          type: 'update',
          measurements, 
          activationDistance 
        });
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(updateMessage);
          }
        });
      }
    } catch (error) {
      console.error('Error procesando mensaje WebSocket:', error);
    }
  });
});


// Ruta para actualizar la distancia de activación desde la web
app.post('/set-activation-distance', (req, res) => {
  const { distance } = req.body;
  if (distance !== undefined && !isNaN(distance) && distance > 0) {
    activationDistance = parseFloat(distance);
    console.log(`Nueva distancia de activación: ${activationDistance} cm`);
    
    // Notificar a los clientes WebSocket
    const message = JSON.stringify({ 
      type: 'activation-update',
      measurements, 
      activationDistance 
    });
    
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