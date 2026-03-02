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
        console.log('Sending POST request with new fields to:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));

        if (response.status === 201 && data.success) {
            console.log('Verification SUCCESS: New fields saved correctly.');
        } else {
            console.log('Verification FAILED: Check response.');
        }
    } catch (error) {
        console.error('Error during verification:', error.message);
    }
}

testUploadWithNewFields();
