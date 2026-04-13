async function testUploadWithNewFields() {
    const url = 'http://localhost:3000/api/employee-monitor';
    const payload = {
        userId: 'EMP123_TEST',
        imageUrl: 'https://example.com/test_activity.png',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        intervalStart: new Date(Date.now() - 60000).toISOString(),
        intervalEnd: new Date().toISOString(),
        mouseClicks: 15,
        mouseMovements: 120,
        keyPresses: 45,
        activeSeconds: 50,
        idleSeconds: 10
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
   
        if (response.status === 201 && data.success) {
        } else {
        }
    } catch (error) {
        console.error('Error during verification:', error.message);
    }
}

testUploadWithNewFields();
