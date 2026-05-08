import './assets/main.css'

// Initialize Prism globally before components load
import Prism from 'prismjs'
import 'prismjs/themes/prism.css'
window.Prism = Prism

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
