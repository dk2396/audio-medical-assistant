import React, { useState } from 'react';
import axios from 'axios';
import AudioRecorder from './Component/AudioRecorder'

function App() {
  const [transcription, setTranscription] = useState('');
 
  const [qaPairs, setQaPairs] = useState([]);

  const handleAudioCaptured = async (audioBlob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result.split(',')[1];  // Get base64 audio string
      try {
        // Step 1: Convert speech to text by calling the `transcribeAudio` function
        const response = await axios.post('https://us-central1-dk78600.cloudfunctions.net/transcribeAudio', {
          audio: base64Audio
        });
        setTranscription(response.data);

        // Step 2: Use the transcription and the prescription to detect questions and suggest answers
        const qaResponse = await axios.post('https://us-central1-dk78600.cloudfunctions.net/processQA', {
          transcription: response.data,
        });


        setQaPairs(qaResponse.data.qaPairs);

      } catch (error) {
        console.error('Error in transcription or QA:', error);
      }
    };
  };

  return (
    <div>
      <h1>Real-Time Medical Assistant</h1>
      <AudioRecorder onAudioCaptured={handleAudioCaptured} />
      
      <h3>Transcription:</h3>
      <p>{transcription}</p>

      <h3>Identified Questions and Answers:</h3>
      <ul>
        {qaPairs.map((qaPair, index) => (
          <li key={index}>
            <strong>Question {index + 1}: </strong>{qaPair.question}
            <br />
            <strong>Answer: </strong>{qaPair.answer}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
