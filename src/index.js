import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { unregister } from './registerServiceWorker';

import ServerRouter from './router.js'


// ReactDOM.render(<App />, document.getElementById('root'));
ReactDOM.render(<ServerRouter />, document.getElementById('root'));

// Unregister service worker if exists on user's browser (should resolve unintended caching)
unregister();
