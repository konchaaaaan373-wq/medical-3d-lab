import './styles/base.css';
import './styles/ui.css';
import { createApp } from './app/App.js';

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');

// Simple loading veil: the first frame has to compile shaders and build geometry.
const veil = document.createElement('div');
veil.className = 'loading';
veil.innerHTML = '<span>building model</span><span class="loading-bar"></span>';
document.body.append(veil);

createApp({ stage, ui })
  .then(() => {
    requestAnimationFrame(() => {
      veil.classList.add('is-done');
      setTimeout(() => veil.remove(), 500);
    });
  })
  .catch((error) => {
    console.error(error);
    veil.innerHTML =
      '<span>Failed to start the 3D view.</span><span style="text-transform:none;letter-spacing:0">Please try a WebGL-capable browser.</span>';
  });
