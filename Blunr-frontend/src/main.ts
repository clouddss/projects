// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker
//     .register('/firebase-messaging-sw.js')
//     .then((registration) => {
//       // console.log('✅ Service Worker registered successfully:', registration);
//       return navigator.serviceWorker.ready;
//     })
//     .then((registration) => {
//       // console.log('✅ Service Worker is ready:', registration);
//     })
//     .catch((error) => {
//       // console.error('❌ Service Worker registration failed:', error);
//     });
// } else {
//   console.warn('❌ Service workers are not supported in this browser.');
// }


import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
