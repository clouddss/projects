importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA-VeN_4JjkawHp-XRjBUNfWEBtN3300sw",
    authDomain: "blunrcom-b457f.firebaseapp.com",
    projectId: "blunrcom-b457f",
    storageBucket: "blunrcom-b457f.firebasestorage.app",
    messagingSenderId: "1025531705732",
    appId: "1:1025531705732:web:a915f060492d396213c5d1",
    measurementId: "G-0Y3GYQF3VS",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("Received background message:");
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
    });
});
