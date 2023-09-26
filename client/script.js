import bot from './assets/bot.svg';
import user from './assets/user.svg';

//we can target the form tag directly because there is only one form
//for the chatContainer, we target the element using the id
const form = document.querySelector('form');
const chatContainer = document.querySelector('#chat_container');
let conversationHistory = [];

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

//types out codex's answer as if a human were typing it instead of all at once
function typeText(element, text) {
  let index = 0;

  let interval = setInterval(() => {
    if(index < text.length) {
      element.innerHTML += text.charAt(index);
      index++;
    } else {
      clearInterval(interval);
    }
  }, 20)
}

//generates unique random id
function generateUniqueId() {
  const timestamp = Date.now();
  const randomNumber = Math.random();
  const hexadecimalString = randomNumber.toString(16);
  return `id-${timestamp}-${hexadecimalString}`;
}

//create striped background in chat to determine if AI is speaking or we are
function chatStripe (isAi, value, uniqueId) {
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
      </div>
    </div>
    `
  )
}

//what to do when the prompt is submitted
const handleSubmit = async (e) => {
  //by default, submitting a form in browser reloads the page
  e.preventDefault();

  const data = new FormData(form);
  const userMessage = data.get('prompt');

  // Add the user's message to the conversation history
  conversationHistory.push({ role: "user", content: userMessage });

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

//listeners for submit button and enter key
form.addEventListener('submit', handleSubmit);
form.addEventListener('keyup', (e) => {
  if(e.keyCode === 13) { //13 = enter key
    handleSubmit(e);
  }
});