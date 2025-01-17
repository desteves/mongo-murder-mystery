<template>
  <div class="timer-container">
    <!-- Table Layout for Timer and Toggle Button -->
    <table class="timer-table">
      <tr>
        <td class="timer-cell">
          <!-- Timer Display (Floating in Bottom-Right) -->
          <div v-if="isVisible" class="timer">
            <h2>⏳ {{ formattedTime }}</h2>
            <button @click="startTimer" :disabled="isRunning">▶️ </button>
            <button @click="pauseTimer" :disabled="!isRunning">⏸️ </button>
            <button @click="resetTimer">🔄</button>
          </div>
        </td>
      </tr>
      <tr>
        <td class="toggle-btn-cell">
          <!-- Toggle Button (Above Timer) -->
          <button class="toggle-btn" @click="toggleVisibility">
            {{ isVisible ? "👀 Hide Timer" : "⏳ Show Timer" }}
          </button>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

export default {
  setup() {
    const time = ref(0);
    const isRunning = ref(false);
    const isVisible = ref(true); // Controls visibility
    let interval = null;

    // Start Timer
    const startTimer = () => {
      if (!isRunning.value) {
        isRunning.value = true;
        interval = setInterval(() => {
          time.value++;
        }, 1000);
      }
    };

    // Pause Timer
    const pauseTimer = () => {
      isRunning.value = false;
      clearInterval(interval);
    };

    // Reset Timer
    const resetTimer = () => {
      isRunning.value = false;
      clearInterval(interval);
      time.value = 0;
      saveState();
    };

    // Toggle Timer Visibility
    const toggleVisibility = () => {
      isVisible.value = !isVisible.value;
      localStorage.setItem("timer-visible", isVisible.value);
    };

    // Save Timer State to localStorage
    const saveState = () => {
      localStorage.setItem("timer-time", time.value.toString());
      localStorage.setItem("timer-running", isRunning.value.toString());
    };

    // Restore Timer State on Page Load
    onMounted(() => {
      const savedTime = localStorage.getItem("timer-time");
      const savedRunning = localStorage.getItem("timer-running");
      const savedVisible = localStorage.getItem("timer-visible");

      if (savedTime) time.value = parseInt(savedTime, 10);
      if (savedRunning === "true") startTimer();
      if (savedVisible !== null) isVisible.value = savedVisible === "true";
    });

    // Auto-save Timer State when time or running state changes
    watch([time, isRunning], saveState);

    // Stop Timer on Unmount
    onUnmounted(() => {
      clearInterval(interval);
    });

    // Format Time to HH:MM:SS
    const formattedTime = computed(() => {
      const hours = Math.floor(time.value / 3600).toString().padStart(2, "0");
      const minutes = Math.floor((time.value % 3600) / 60).toString().padStart(2, "0");
      const seconds = (time.value % 60).toString().padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    });

    return { time, isRunning, isVisible, startTimer, pauseTimer, resetTimer, toggleVisibility, formattedTime };
  },
};
</script>

<style scoped>
/* Container for Timer and Toggle Button */
.timer-container {
  position: fixed;
  bottom: 5vh;
  right: 2rem;
  z-index: 1000;
}

/* Table Layout to Control Timer and Button Position */
.timer-table {
  border-spacing: 0;
  width: 12rem;
  /* Consistent width */
}

/* Timer cell */
.timer-cell {
  padding: 0.5rem 0;
  text-align: center;
  background-color: var(--nav-bg-color);
  border-radius: 0.625rem;
  box-shadow: 0px 0.25rem 0.625rem rgba(0, 0, 0, 0.2);
}

/* Timer styling */
.timer {
  font-size: 1.2rem;
  color: var(--text-color);
}

/* Toggle Button cell */
.toggle-btn-cell {
  padding: 0.5rem 0;
  text-align: center;
}

/* Toggle button styling */
.toggle-btn {
  background: var(--nav-active-bg-color);
  color: var(--body-bg);
  padding: 0.625rem 1rem;
  border-radius: 0.375rem;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0px 0.25rem 0.625rem rgba(0, 0, 0, 0.2);
  width: 100%;
  text-align: center;
}
</style>