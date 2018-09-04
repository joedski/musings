// This file installs the deps.  Theoretically, it's only loaded once.
import Vue from 'vue';
import DemoDep from '@/plugins/DemoDep';

// eslint-disable-next-line
console.log('Installing DemoDepComponent...!');

Vue.use(DemoDep);
