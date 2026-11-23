self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Reset',
      body: event.data?.text() || 'لديك تحديث جديد.'
    };
  }

  const title = data.title || 'Reset';

  const options = {
    body: data.body || 'لديك تحديث جديد.',
    icon: '/reset-logo.svg',
    badge: '/reset-logo.svg',
    data: {
      url: data.url || '/api/orders'
    },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url || '/api/orders',
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          return client.navigate(target).then(() => client.focus());
        }
      }

      return clients.openWindow(target);
    })
  );
});