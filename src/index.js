import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import { unregister } from './registerServiceWorker';

import ServerRouter from './router.js'

// ReactDOM.render(<App />, document.getElementById('root'));
ReactDOM.render(<ServerRouter />, document.getElementById('root'));

registerServiceWorker();
unregister(); // TODO 2021/1/21, Elvis - Incorporate visualizer into React site