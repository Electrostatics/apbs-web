import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { unregister } from './registerServiceWorker';
import viewerUrl from '3dmol/build/3Dmol-nojquery-min.js?url';

const root = document.getElementById('root');
function showStartupError(error) {
  console.error('Unable to start APBS Web:', error);
  root.setAttribute('role', 'alert');
  root.textContent = 'Unable to load the application. Please reload the page.';
}

// This legacy distribution exposes its API as a browser global, not a reliable CommonJS export.
const viewerScript = document.createElement('script');
viewerScript.src = viewerUrl;
viewerScript.onload = () => {
  if (!window.$3Dmol || !window.$3Dmol.createViewer) {
    showStartupError(new Error('The molecular viewer did not initialize.'));
    return;
  }
  import('./router').then(({ default: ServerRouter }) => {
    ReactDOM.render(<ServerRouter />, root);
  }).catch(showStartupError);
};
viewerScript.onerror = () => showStartupError(new Error('The molecular viewer could not be loaded.'));
document.head.appendChild(viewerScript);

// Unregister service worker if exists on user's browser (should resolve unintended caching)
unregister();
