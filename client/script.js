import bot from './assets/bot.svg';
import user from './assets/user.svg';

//we can target the form tag directly because there is only one form
//same with the textarea prompt
//for the chatContainer, we target the element using the id

const form = document.querySelector('form');
const textarea = document.querySelector('textarea');
const chatContainer = document.querySelector('#chat_container');
let conversationHistory = [];
let selectedModel = '';

let loadInterval;

//displays the loading dots when waiting for codex's answer to prompt
function loader(element) {
  element.textContent = '';

  loadInterval = setInterval(() => {
    element.textContent += '.';

    if (element.textContent === '....') {
      element.textContent = '.';
    }
  }, 300)
}

// Display the entire text and apply Prism highlighting at once
function typeText(element, text) {
  // Extract language from triple backticks, if present
  const codeBlockRegex = /```([a-zA-Z]+)?\s*([\s\S]*?)```/g;
  text = text.replace(codeBlockRegex, (match, language, code) => {
    const highlightedCode = Prism.highlight(code, Prism.languages[language], language);
    return `<pre class="language-${language}"><code>${highlightedCode}</code></pre>`;
  });

  element.innerHTML = text;

  // Highlight code blocks enclosed in triple backticks
  const codeBlocks = element.querySelectorAll('pre code');
  codeBlocks.forEach(block => {
    Prism.highlightElement(block);
  });
}


//generates unique random id
function generateUniqueId() {
  const timestamp = Date.now();
  const randomNumber = Math.random();
  const hexadecimalString = randomNumber.toString(16);
  return `id-${timestamp}-${hexadecimalString}`;
}

//function to update the model value based on the selected option
function updateModel() {
  let gptModel = document.getElementById('modelSelect');
  // Update the global variable with the selected model
  selectedModel = gptModel.value;

  // Log the selected model for demonstration purposes
  console.log('Selected Model:', selectedModel);
}

//create striped background in chat to determine if AI is speaking or we are
function chatStripe(isAi, value, uniqueId) {
  return (
    `
    <div class="wrapper ${isAi && 'ai'}">
      <div class="chat">
        <div class="profile">
          <img
            src="${isAi ? bot : user}"
            alt="${isAi ? 'bot' : 'user'}"
          />
        </div>
        <div class="message" id=${uniqueId}>${value}</div>
        ${isAi ? `<button style="font-size: 26px" onclick="copyToClipboard('${uniqueId}')">📋</button>` : ''}
      </div>
    </div>
    `
  );
}


window.copyToClipboard = function(id) {
  const textToCopy = document.getElementById(id).textContent;
  navigator.clipboard.writeText(textToCopy)
};

//what to do when the prompt is submitted
const handleSubmit = async (e) => {
  //by default, submitting a form in browser reloads the page
  e.preventDefault();

  const data = new FormData(form);
  const userMessage = data.get('prompt');

  // Add the user's message to the conversation history
  conversationHistory.push({ role: "user", content: userMessage });
  // Resets the height to its original value
  textarea.style.height = '';  

  //user's chatStripe
  chatContainer.innerHTML += chatStripe(false, userMessage);
  form.reset();

  //bot's chatStripe
  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

  //scroll with answer as it is being typed out
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const messageDiv = document.getElementById(uniqueId);

  loader(messageDiv);

  //fetch data from server -> bot's response
  const response = await fetch(
    'https://codex-edaa.onrender.com'
    // uncomment to test server locally - 'http://localhost:5000'
    // go to cd server and npm start server, then from client in another terminal window npm run dev
    , {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: selectedModel,
      prompt: userMessage
    })
  })

  clearInterval(loadInterval);
  messageDiv.innerHTML = '';

  if(response.ok) {
    const data = await response.json();
    const botMessage = data.bot.trim();

    conversationHistory.push({ role: "assistant", content: botMessage });

    console.log({parsedData: botMessage});
    typeText(messageDiv, botMessage);
  } else {
    const err = await response.text();

    messageDiv.innerHTML = "Something went wrong";
    console.log(err);
    alert(err);
  }
}

//listeners for submit button and adjust textarea height
form.addEventListener('submit', handleSubmit);

const maxTextAreaHeight = window.innerHeight * 0.5; //max 50% of screen height
textarea.style.overflowY = 'auto'; // enable scrolling

textarea.addEventListener('input', () => {
  if(textarea.scrollHeight <= maxTextAreaHeight) {
    // auto resize textarea when content doesn't exceed 50% screen height
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  } else {
    // fix textarea height at 50% screen height when content exceeds it
    textarea.style.height = `${maxTextAreaHeight}px`;
  }
});

//do we want to have enter submit the form? For now, no.
/*form.addEventListener('keyup', (e) => {
  if(e.keyCode === 13) { //13 = enter key
    handleSubmit(e);
  }
});*/
