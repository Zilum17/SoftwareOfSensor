

<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center">
    <div class="min-w-250 min-h-100 overflow-hidden mt-40 mb-40 rounded-lg bg-slate-200 shadow-2xs flex items-center justify-start flex-col p-6">
      <h1 class="w-full h-16 bg-slate-600 flex items-center justify-center text-teal-400 font-medium text-[20px] rounded-t-lg">
        Control de Distancia de Activación
      </h1>
      
      <div class="form flex gap-4 justify-center items-center p-2 h-20 w-full bg-slate-300 animate-move rounded-b-lg">
        <label class="p-2"  for="activationDistance">Distancia de activación (cm):</label>
        <input type="number" class="h-11 block px-3 py-2 bg-slate-200 border border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" id="activationDistance" v-model="activationDistanceInput" min="1" />
        <button class="block h-11 cursor-pointer bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700/90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors" @click="setActivationDistance">Actualizar</button>
      </div>
      
      <p class="w-full mt-4 text-center p-2">Umbral actual: <span>{{ currentThreshold }}</span> cm</p>
      
      <h2 class="w-full mb-4 text-center p-2">Mediciones Recibidas</h2>
      <span class="w-full h-0.5 block bg-slate-300"></span>

      <ul class="w-full h-auto flex flex-col items-center justify-start">
        <li class="p-3 min-h-6 w-full flex justify-between" v-for="m in measurements" :key="m.timestamp">
          <p class="inline-block w-1/2 p-2">{{ m.timestamp }}</p>
          <span class="inline-block w-0.5 h-10 bg-slate-300"></span>
          <p class="inline-block w-1/4 p-2">{{ m.distance }} cm</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import axios from 'axios';
  let ws = null;
  const measurements = ref([]);
  const currentThreshold = ref(20);
  const activationDistanceInput = ref(20);
  const connectWebSocket = () => {
    ws = new WebSocket('ws://localhost:8080'); // Reemplaza con la IP de tu laptop

    ws.onopen = () => {
      console.log('Conectado al WebSocket');
    };

    ws.onmessage = (event) => {
      
      const data = JSON.parse(event.data);
      measurements.value = data.measurements;
      currentThreshold.value = data.activationDistance;
      
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado, intentando reconectar...');
      setTimeout(connectWebSocket, 3000); // Reintentar cada 3 segundos
    };

    ws.onerror = (error) => {
      console.error('Error en WebSocket:', error);
    };
  };

  const setActivationDistance = async () => {
    try {
      const response = await axios.post('/api/set-activation-distance', {
        distance: activationDistanceInput.value
      });
      if (response.status === 200) {
        console.log('Distancia actualizada');
      } else {
        console.log('Error al actualizar');
      }
    } catch (error) {
      console.error('Error:', error);
      console.log('Error al actualizar');
    }
  };


  onMounted(() => {
    connectWebSocket();
  });

  onUnmounted(() => {
    if (ws) ws.close();
  });
</script>

<style scoped>

</style>
