import 'todomvc-app-css/index.css';
import hyper from 'hyperhtml';

const appEl = document.getElementById('app');

hyper(appEl)`<section className="todoapp">hi</section>`;
