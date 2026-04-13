const fetch = globalThis.fetch;
(async () => {
  try {
    const res = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.technotoil@gmail.com', password: 'Admin@1234' })
    });

  } catch (err) {
    console.error('ERR', err);
  }
})();
