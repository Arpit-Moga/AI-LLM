import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'xterm/css/xterm.css';
// Remove the default index.css and import our new App.css
import './App.css' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)