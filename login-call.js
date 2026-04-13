const fetch = require('node-fetch');
(async () => {
  const res = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.technotoil@gmail.com', password: 'Admin@1234' })
  });

})();
