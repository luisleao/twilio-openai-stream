import 'colors';
import { EventEmitter } from 'events';
import OpenAI from 'openai';

class GptService extends EventEmitter {
  constructor() {
    super();
    this.openai = new OpenAI();
    this.partialResponseIndex = 0;
    this.threadId = null;
    this.assistantId = process.env.ASSISTANT_ID; // Defina seu assistantId aqui
    this.messageId = null;
  }

  async createThread() {
    // Step 1: Create a new thread with the initial message
    const response = await this.openai.beta.threads.create();
    this.threadId = response.id;
    console.log(`Thread created with ID: ${this.threadId}`.green);
    return this.threadId;
  }

  async completion(message) {
    this.messageId = message['id'];
    if (!this.threadId) {
      console.error('Thread ID is not set. Please create a thread first.');
      return;
    }

    // Step 2: Send user transcription to the existing thread
    await this.openai.beta.threads.messages.create(this.threadId, {
      role: "user",
      content: message.text
    });

    let buffer = '';
    let textOrder = 0;
    const run = await this.openai.beta.threads.runs
      .stream(this.threadId, {
        assistant_id: this.assistantId,
        max_completion_tokens: process.env.MAX_COMPLETION_TOKENS || 8096,
        max_prompt_tokens: process.env.MAX_PROMPT_TOKENS || 60000
      })
      .on('textCreated', (text) => {
        console.log('\nassistant > ', text);
      })
      .on('textDelta', async (textDelta, snapshot) => {
        buffer += textDelta.value;

        if (buffer.length >= 250) {
            let mensagem = '';
            const temQuebra = buffer.lastIndexOf('\n\n') > 0;
            mensagem = buffer.substring(0, buffer.lastIndexOf(temQuebra ? '\n\n' : '. ') + ( temQuebra ? 2 : 1));
            buffer = buffer.substring(buffer.lastIndexOf(temQuebra ? '\n\n' : '. ') + ( temQuebra ? 2 : 1)).trimStart();
            this.emit('gptreply', {
              id: this.messageId,
              partialResponse: mensagem,
              partialOrder: textOrder,
            });
            textOrder += 1;
        }
      })
    .on('textDone', async (content, snapshot) => {
        if (buffer.length !== 0) {
          this.emit('gptreply', {
            id: message.id,
            partialResponse: buffer,
            partialOrder: textOrder,
          });
        }
      })
  }
}

export { GptService };
