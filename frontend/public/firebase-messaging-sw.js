/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA5Ngm4gs4PyK7IvbnsugQGNsSZVPaR8wM",
  authDomain: "agrosmart-mp.firebaseapp.com",
  projectId: "agrosmart-mp",
  messagingSenderId: "652871993060",
  appId: "1:652871993060:web:842e454e11ab3f3a8ecef1",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const actions = data.type === "manual_timer_expired"
    ? [
      { action: "continue", title: "Continue" },
      { action: "stop", title: "Stop" },
    ]
    : [];
  self.registration.showNotification(notification.title || "AgroSmart alert", {
    body: notification.body || "Open AgroSmart to view this update.",
    icon: notification.icon || "/favicon.svg",
    data,
    actions,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL("/irrigation", self.location.origin);
  if (event.action === "continue" || event.action === "stop") {
    target.searchParams.set("notificationAction", event.action);
    if (data.deviceId) target.searchParams.set("deviceId", data.deviceId);
  }

  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      return existing.navigate(target.href).then((client) => client.focus());
    }
    return self.clients.openWindow(target.href);
  }));
});
