const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });
const speech = require('@google-cloud/speech');
const OpenAI = require('openai');

const { HfInference } = require('@huggingface/inference');  


// Initialize Hugging Face Inference API with the API key
const hf = new HfInference(functions.config().huggingface.key);  



const openai = new OpenAI({
  apiKey: functions.config().openai.key,  // Fetch the OpenAI API key from Firebase environment
});
 

const client = new speech.SpeechClient();

const medicalDocument = `
  Medication: Amlodipine
  Description: Amlodipine is a calcium channel blocker used to treat high blood pressure (hypertension) and chest pain (angina).

  Common Uses:
  - Treats high blood pressure by relaxing blood vessels so blood can flow more easily.
  - Treats chest pain by increasing blood flow to the heart.

  Common Side Effects:
  - Dizziness
  - Swelling of the ankles or feet
  - Fatigue
  - Nausea
  - Flushing

  Precautions:
  - Before taking amlodipine, inform your doctor if you have any heart conditions, liver disease, or if you are pregnant or breastfeeding.
`;

exports.transcribeAudio = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      console.log('Received request: ', req.body);  // Log the incoming request body

      const audioBytes = req.body.audio;
      if (!audioBytes) {
        console.error('No audio data received');
        return res.status(400).send('No audio data received.');
      }

      const audio = { content: audioBytes };

      // Configure the Speech-to-Text request
      const request = {
        audio: audio,
        config: {
          encoding: 'WEBM_OPUS',  // Ensure encoding matches the audio format
          languageCode: 'en-US',
        },
      };

      console.log('Sending request to Google Speech-to-Text API...');
      const [response] = await client.recognize(request);  // Call the API

      if (!response.results || response.results.length === 0) {
        console.error('No transcription results received');
        return res.status(500).send('No transcription results received.');
      }

      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      
      console.log('Transcription:', transcription);  // Log the transcription result
      res.status(200).send(transcription);
    } catch (error) {
      console.error('Error during transcription:', error);
      res.status(500).send('Transcription failed: ' + error.message);
    }
  });
});




// Function to process question and answer using predefined medical document
exports.processQA = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { transcription } = req.body;  // Receive transcription from frontend


      const qaPairs = await extractQuestionsAndAnswersFromTranscriptionWithGPT(transcription, medicalDocument);


      res.json({ qaPairs });
    } catch (error) {
      console.error('Error processing question-answering:', error);
      res.status(500).send('Error processing request.');
    }
  });
});



// Function to provide answers for each identified question using Hugging Face's question-answering model used in ntial then switched back to gpt3 model
// async function provideAnswersForQuestions(questions, context) {
//   const answers = [];

//   for (const question of questions) {
//     const response = await hf.questionAnswering({
//       model: 'deepset/roberta-base-squad2',
//       inputs: {
//         question: question,  // The identified question
//         context: context,  // Medical document is used as the context
//       },
//     });

//     answers.push({
//       question: question,
//       answer: response.answer.trim(),
//     });
//   }

//   return answers;
// }




// Function to extract multiple questions and provide answers using GPT-3.5/4
async function extractQuestionsAndAnswersFromTranscriptionWithGPT(transcription, context) {
  const prompt = `
    Based on the following transcription, extract any questions and provide answers using the medical document below.
    Transcription: "${transcription}"
    Medical Document: "${context}"
    List the questions and answers in the following format:
    - Question: [Question]
    - Answer: [Answer]
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',  
    messages: [{ role: 'system', content: prompt }],
    max_tokens: 500,
    temperature: 0.7,
  });

  const result = response.choices[0].message.content.trim();
  

  const qaPairs = result.split('\n\n').map(pair => {
    const [questionLine, answerLine] = pair.split('\n');
    return {
      question: questionLine.replace('Question: ', '').trim(),
      answer: answerLine.replace('Answer: ', '').trim(),
    };
  });

  return qaPairs;
}

