<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center">
    <div class="min-w-[200px] min-h-[100px] mt-20 mb-20 rounded-lg bg-slate-200 shadow-2xs flex items-center justify-start flex-col p-6">
      <h1 class="w-full h-18 bg-slate-800 flex items-center justify-center text-teal-400 font-medium text-[20px] rounded-t-lg">
        Control de Distancia de Activación
      </h1>
      
      <div class="form flex gap-4 justify-center items-center p-2 h-20 w-full bg-slate-300 animate-move rounded-b-lg">
        <label class="p-2" for="activationDistance">Distancia de activación (cm):</label>
        <input
          type="number"
          class="h-11 block px-3 py-2 bg-slate-200 border border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          id="activationDistance"
          v-model.number="newActivationDistance"
          min="1"
        />
        <button
          class="block h-11 cursor-pointer bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700/90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
          @click="updateActivationDistance"
        >
          Actualizar
        </button>
      </div>
      
      <p class="w-full mt-4 text-center p-2">Umbral actual: <span>{{ activationDistance }}</span> cm</p>
      
      <h2 class="w-full mb-4 text-center p-2">Mediciones Recibidas</h2>
      <span class="w-full h-0.5 block bg-slate-300"></span>

      <ul ref="measurementsList" class="w-full h-auto max-h-[50vh] overflow-y-auto flex flex-col items-center justify-start">
        <li class="min-h-18 p-2 w-full flex justify-between items-center" v-for="(m, index) in measurements" :key="m.id || m.timestamp">
          <p class="inline-block w-1/16 p-2">{{ index + 1 }}</p>
          <p class="inline-block w-1/2 p-2">{{ m.timestamp }}</p>
          <span class="inline-block w-0.5 h-10 bg-slate-300"></span>
          <p class="inline-block w-1/4 p-2">{{ m.distance }} cm</p>
        </li>
      </ul>

      <div v-if="connectionError" class="w-full mt-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200">
        Error de conexión. Intentando reconectar...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import axios from 'axios';

// Reactive references
const measurements = ref([]);
const activationDistance = ref(20.0);
const newActivationDistance = ref(20);
const socket = ref(null);
const connectionError = ref(false);
const reconnectAttempts = ref(0);
const measurementsList = ref(null);

// Conexión WebSocket
const connectWebSocket = () => {
  try {
    socket.value = new WebSocket('ws://localhost:8080');
    
    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    socket.value.onopen = () => {
      console.log('Conectado al servidor WebSocket');
      connectionError.value = false;
      reconnectAttempts.value = 0;
    };
    
    socket.value.onerror = (error) => {
      console.error('Error en WebSocket:', error);
      connectionError.value = true;
    };
    
    socket.value.onclose = () => {
      console.log('Conexión WebSocket cerrada');
      if (reconnectAttempts.value < 5) {
        setTimeout(() => {
          reconnectAttempts.value++;
          connectWebSocket();
        }, 2000 * reconnectAttempts.value);
      }
    };
  } catch (error) {
    console.error('Error al conectar WebSocket:', error);
  }
};

// Función para hacer scroll al inicio de la lista
const scrollToTop = () => {
  nextTick(() => {
    if (measurementsList.value && measurementsList.value.scrollHeight > measurementsList.value.clientHeight) {
      // Scroll al inicio del <ul>
      measurementsList.value.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      // Scroll al inicio de la ventana
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  });
};

// Watch para detectar cambios en las mediciones
watch(
  measurements,
  (newVal, oldVal) => {
    if (newVal.length > oldVal.length) {
      scrollToTop();
    }
  },
  { deep: true }
);

// Manejar mensajes WebSocket
const handleWebSocketMessage = (data) => {
  switch (data.type) {
    case 'initial-data':
      measurements.value = [...data.measurements].reverse();
      activationDistance.value = data.activationDistance;
      scrollToTop();
      break;
    case 'update':
      measurements.value = [...data.measurements].reverse();
      scrollToTop();
      break;
    case 'activation-update':
      activationDistance.value = data.activationDistance;
      break;
  }
};

// Obtener datos iniciales
const fetchInitialData = async () => {
  try {
    const response = await axios.get(`/api/get-data`);
    measurements.value = [...response.data.measurements].reverse();
    activationDistance.value = response.data.activationDistance;
    newActivationDistance.value = response.data.activationDistance;
    scrollToTop();
  } catch (error) {
    console.error('Error fetching initial data:', error);
    connectionError.value = true;
  }
};

// Actualizar distancia de activación
const updateActivationDistance = async () => {
  if (newActivationDistance.value && newActivationDistance.value > 0) {
    try {
      await axios.post(`/api/set-activation-distance`, {
        distance: parseFloat(newActivationDistance.value),
      });
    } catch (error) {
      console.error('Error updating activation distance:', error);
      connectionError.value = true;
    }
  }
};

// Ciclo de vida del componente
onMounted(() => {
  fetchInitialData();
  connectWebSocket();
});

onBeforeUnmount(() => {
  if (socket.value) {
    socket.value.close();
  }
});
</script>

<style scoped>

</style>
