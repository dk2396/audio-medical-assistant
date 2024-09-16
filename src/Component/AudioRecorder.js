import React, { useState, useRef } from 'react';

function AudioRecorder({ onAudioCaptured }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null); 
  const startRecording = () => {
    setIsRecording(true);
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        const mediaRecorder = new MediaRecorder(stream,options);
        mediaRecorderRef.current = mediaRecorder; 

        mediaRecorder.ondataavailable = (e) => {
          const audioBlob = new Blob([e.data], { type: 'audio/webm' });
          console.log('Audio Blob Type:', audioBlob.type);
          onAudioCaptured(audioBlob); 
        };
        
        mediaRecorder.start();
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop(); // Stop the mediaRecorder from ref
      setIsRecording(false);
    }
  };

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>Start Recording</button>
      <button onClick={stopRecording} disabled={!isRecording}>Stop Recording</button>
    </div>
  );
}

export default AudioRecorder;
