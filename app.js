import 'dotenv/config';
import 'colors';

import express from 'express';
import ExpressWs from 'express-ws';
import { GptService } from './services/gpt-service.js';
import { StreamService } from './services/stream-service.js';
import { TranscriptionService } from './services/transcription-service.js';
import { TextToSpeechService } from './services/tts-service.js';
import { recordingService } from './services/recording-service.js';
import twilio from 'twilio';
const VoiceResponse = twilio.twiml.VoiceResponse;

// Inicializa o servidor Express
const app = express();
ExpressWs(app);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  
  res.type('text/plain');
  res.end("OK");
 
});

app.all('/incoming', (req, res) => {
  console.log(req.rawHeaders[1]);
  try {
    const response = new VoiceResponse();
    const connect = response.connect();
    connect.stream({ url: `wss://${req.rawHeaders[1]}/connection` });
  
    res.type('text/xml');
    res.end(response.toString());
  } catch (err) {
    console.log(err);
  }
});

app.ws('/connection', (ws) => {
  try {
    ws.on('error', console.error);
    // Filled in from start message
    let streamSid;
    let callSid;

    const gptService = new GptService();
    const streamService = new StreamService(ws);
    const transcriptionService = new TranscriptionService();
    const ttsService = new TextToSpeechService({});
  
    let marks = [];
  
    // Incoming from MediaStream
    ws.on('message', function message(data) {
      const msg = JSON.parse(data);
      if (msg.event === 'start') {
        streamSid = msg.start.streamSid;
        callSid = msg.start.callSid;
        
        streamService.setStreamSid(streamSid);
        gptService.createThread();

        //Primeira mensagem
        transcriptionService.startSTT();
        ttsService.generate({partialResponse: 'Oi, eu sou Lex, a primeira inteligencia artificial legislativa do mundo. Como posso te ajudar?', partialOrder:0, id:'firstmessage'});

      } else if (msg.event === 'media') {
        if (transcriptionService.recognizeStream.destroyed) return;

        transcriptionService.send(msg.media.payload);
      } else if (msg.event === 'mark') {
        const label = msg.mark.name;
        console.log(`Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`.red);
        marks = marks.filter(m => m !== msg.mark.name);
      } else if (msg.event === 'stop') {
        transcriptionService.recognizeStream.destroy();
        console.log(`Twilio -> Media stream ${streamSid} ended.`.underline.red);
      }
    });
  
    transcriptionService.on('utterance', async (text) => {
      // This is a bit of a hack to filter out empty utterances
      if(marks.length > 0 && text?.length > 5) {
        console.log('Twilio -> Interruption, Clearing stream'.red);
        ws.send(
          JSON.stringify({
            streamSid,
            event: 'clear',
          })
        );
      }
    });
  
    transcriptionService.on('transcription', async (message) => {
      if (!message.text) { return; }
      console.log(`Interaction – STT -> GPT: ${message.text}`.yellow);
      gptService.completion(message);
    });
    
    gptService.on('gptreply', async (message) => {
      console.log(`Interaction: GPT -> TTS: ${message.partialResponse}`.green );
      ttsService.generate(message);
    });
  
    ttsService.on('speech', (audio, message) => {
      console.log(`TTS -> TWILIO: ${message.partialResponse}`.blue);
  
      streamService.buffer(audio, message);
    });
  
    streamService.on('audiosent', (markLabel) => {
      marks.push(markLabel);
    });
  } catch (err) {
    console.log(err);
  }
});

// Carrega os dados e inicia o servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
