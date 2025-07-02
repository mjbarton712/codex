const form = document.querySelector('form');
const textarea = document.querySelector('textarea');
const chatContainer = document.querySelector('#chat_container');
const modelSelect = document.getElementById('modelSelect'); // Get the select element

// Initialize conversation history with a system message
let conversationHistory = [
    { role: "system", content: "You are a helpful assistant." }
];

// Initialize selectedModel with the dropdown's current value on load
let selectedModel = modelSelect.value;

let loadInterval;

// Displays the loading dots when waiting for the AI's answer
function loader(element) {
  element.textContent = '';
  loadInterval = setInterval(() => {
    element.textContent += '.';
    if (element.textContent === '....') {
      element.textContent = '.';
    }
  }, 300);
}



marked.setOptions({
  gfm: true,
  breaks: true,
  sanitize: false
});


// Generates a unique random ID for each message
function generateUniqueId() {
  const timestamp = Date.now();
  const randomNumber = Math.random();
  const hexadecimalString = randomNumber.toString(16);
  return `id-${timestamp}-${hexadecimalString}`;
}

// Updates the model value when the user changes the dropdown
export function updateModel() {
  selectedModel = modelSelect.value;
  console.log('Selected Model:', selectedModel);
}
// Attach the function to the window object so it can be called from the HTML
window.updateModel = updateModel;


// Creates the HTML for a chat stripe (either user or AI)
function chatStripe(isAi, value, uniqueId) {
  return (
    `
    <div class="wrapper ${isAi ? 'ai' : ''}">
      <div class="chat">
        <div class="profile">
          <i data-lucide="${isAi ? 'bot' : 'user'}"></i>
        </div>
        <div class="message" id=${uniqueId}>${value}</div>
        ${isAi ? `<button class="copy-btn" title="Copy response" onclick="copyToClipboard('${uniqueId}')"><i data-lucide="copy"></i></button>` : ''}
      </div>
    </div>
    `
  );
}

// Copy full message text to clipboard
window.copyToClipboard = function(id) {
  const messageElement = document.getElementById(id);
  // Use innerText to get the text as it's rendered, which is better for copying
  navigator.clipboard.writeText(messageElement.innerText);
};

// Copy only the code snippet to clipboard
window.copyCodeSnippetToClipboard = function(buttonElement) {
  const codeContainer = buttonElement.closest('.code-container');
  const codeElement = codeContainer.querySelector('code');
  navigator.clipboard.writeText(codeElement.innerText).then(() => {
    const copySpan = buttonElement.querySelector('span');
    const originalText = copySpan.innerText;
    copySpan.innerText = 'Copied!';
    setTimeout(() => {
        copySpan.innerText = originalText;
    }, 2000);
  });
};

// Handles the form submission
const handleSubmit = async (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const userMessage = data.get('prompt').trim();
  
  if (!userMessage) return; // Don't send empty messages

  // Add the user's message to the conversation history
  conversationHistory.push({ role: "user", content: userMessage });
  
  textarea.style.height = 'auto'; // Reset textarea height
  
  // Display user's message
  chatContainer.innerHTML += chatStripe(false, userMessage);
  lucide.createIcons();
  form.reset();

  // Prepare bot's chat stripe
  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);
  lucide.createIcons();
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const messageDiv = document.getElementById(uniqueId);
  loader(messageDiv);

  try {
    const response = await fetch('https://codex-edaa.onrender.com', {
    // const response = await fetch('http://localhost:5001', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: conversationHistory 
      })
    });

    clearInterval(loadInterval);
    messageDiv.innerHTML = '';

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'The server responded with an error.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let botMessage = '';
    let buffer = '';
    let isInCodeBlock = false;
    let currentCodeBlock = '';
    let codeLanguage = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();

          if (dataStr === '[DONE]') {
            // Don't re-render at the end, just update conversation history
            conversationHistory.push({ role: "assistant", content: botMessage });
            return;
          }

          try {
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              botMessage += content;
              
              // Convert markdown and display
              messageDiv.innerHTML = marked.parse(botMessage);

              // Manually wrap and highlight code blocks
              const codeBlocks = messageDiv.querySelectorAll('pre code');
              codeBlocks.forEach((codeBlock) => {
                const preElement = codeBlock.parentElement;
                const language = codeBlock.className.replace('language-', '') || 'plaintext';

                const codeContainer = document.createElement('div');
                codeContainer.className = 'code-container';

                const topBar = document.createElement('div');
                topBar.className = 'top-bar';

                const langLabel = document.createElement('span');
                langLabel.className = 'language-label';
                langLabel.innerText = language;

                const copyButton = document.createElement('button');
                copyButton.className = 'copy-code-snippet';
                copyButton.innerHTML = `<i data-lucide="copy"></i><span>Copy</span>`;
                copyButton.onclick = () => copyCodeSnippetToClipboard(copyButton);

                topBar.appendChild(langLabel);
                topBar.appendChild(copyButton);

                codeContainer.appendChild(topBar);
                preElement.parentNode.insertBefore(codeContainer, preElement);
                codeContainer.appendChild(preElement);

                hljs.highlightBlock(codeBlock);
              });

              lucide.createIcons();
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } catch (err) {
            console.error("Failed to parse stream data:", err);
          }
        }
      }
    }

    // Don't re-render at the end
    conversationHistory.push({ role: "assistant", content: botMessage });

  } catch (error) {
    clearInterval(loadInterval);
    messageDiv.innerHTML = "Something went wrong. Please check the console.";
    console.error(error);
    alert(error.message);
  }
}

form.addEventListener('submit', handleSubmit);

// Auto-resize textarea logic
const maxTextAreaHeight = window.innerHeight * 0.5;
textarea.style.overflowY = 'auto';

textarea.addEventListener('input', () => {
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, maxTextAreaHeight);
  textarea.style.height = `${newHeight}px`;
});

// Allow submitting with Enter, but not Shift+Enter for new lines
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent new line on Enter
        handleSubmit(e);
    }
});