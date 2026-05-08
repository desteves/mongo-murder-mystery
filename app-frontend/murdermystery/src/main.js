import './assets/main.css'

// Initialize Prism globally before components load
import Prism from 'prismjs'
import 'prismjs/themes/prism.css'
window.Prism = Prism
// Load JSON language support after Prism is available
import 'prismjs/components/prism-json.min.js'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
