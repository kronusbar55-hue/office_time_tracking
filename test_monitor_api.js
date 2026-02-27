async function testUpload() {
    const url = 'http://localhost:3000/api/employee-monitor';
    const payload = {
        userId: 'EMP123',
        imageUrl: 'https://example.com/screenshot.png',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0]
    };

    try {
        console.log('Sending POST request to:', url);
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
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testUpload();
