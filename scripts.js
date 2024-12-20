const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');
const settingsPanel = document.getElementById('settings-panel');
let apiKey = '';
let googleApiKey = '';
let systemInstructions = 'You are a helpful assistant.';
let selectedModel = 'gpt-4o-mini';
let conversationHistory = [
    { role: "system", content: systemInstructions }
];

function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(sender === 'User' ? 'message-user' : 'message-assistant');

    const parts = message.split(/```/);
    messageElement.innerHTML = `<strong>${sender}</strong>: ${parts[0].trim()}`;

    for (let i = 1; i < parts.length; i += 2) {
        const codeBlock = document.createElement('div');
        codeBlock.classList.add('code-block');
        const codeContent = parts[i].trim();
        codeBlock.innerText = codeContent;

        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.innerText = 'Copy Code';
        copyButton.onclick = () => {
            navigator.clipboard.writeText(codeContent).then(() => {
                alert('Code copied to clipboard!');
            });
        };

        messageElement.appendChild(codeBlock);
        messageElement.appendChild(copyButton);

        if (i + 1 < parts.length) {
            const textPart = document.createElement('div');
            textPart.innerHTML = `<strong>${sender}</strong>: ${parts[i + 1].trim()}`;
            messageElement.appendChild(textPart);
        }
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveSettings() {
    apiKey = document.getElementById('api-key-input').value.trim();
    googleApiKey = document.getElementById('google-api-key-input').value.trim();
    systemInstructions = document.getElementById('system-instructions-input').value.trim();
    selectedModel = document.getElementById('model-select').value;
    conversationHistory = [{ role: "system", content: systemInstructions }];
    alert('Settings saved successfully!');
}

function toggleSettings() {
    settingsPanel.classList.toggle('show');
    chatContainer.classList.toggle('settings-open');
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (message && (apiKey || googleApiKey)) {
        addMessage('User', message);
        conversationHistory.push({ role: "user", content: message }); // User message with 'user' role
        userInput.value = '';

        try {
            let response, data;

            if (selectedModel === 'gemini-1.5-flash' || selectedModel === 'gemini-2.0-flash-exp') {
                if (!googleApiKey) {
                    alert('Google API Key is mandatory for the gemini model');
                    return;
                }

                // Prepare the request body, excluding system messages
                const filteredHistory = conversationHistory.filter(msg => msg.role !== "system");
                
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${googleApiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: filteredHistory.map(msg => ({
                            role: msg.role === "assistant" ? "model" : msg.role,
                            parts: [{ text: msg.content }]
                        }))
                    })
                });

                data = await response.json();
                console.log('Gemini API Response:', data); // Display the raw response for debugging

                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                    const botMessage = data.candidates[0].content.parts[0].text.trim();
                    addMessage('Ashish', botMessage);
                    conversationHistory.push({ role: "model", content: botMessage }); // Add model response
                } else {
                    addMessage('Ashish', 'Sorry, no response from the model.');
                }
            } else {
                // Logic for OpenAI API
                response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + apiKey
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: conversationHistory,
                        max_tokens: 1000
                    })
                });
                
                data = await response.json();
                const botMessage = data.choices[0].message.content.trim();
                addMessage('Ashish', botMessage);
                conversationHistory.push({ role: "assistant", content: botMessage }); // Push OpenAI response
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('Ashish', 'Sorry, something went wrong.'); // General error handling
        }
    } else {
        alert('API Key and Google API Key are mandatory for their respective models');
    }
}