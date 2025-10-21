import { useEffect, useRef } from 'react';

export const Audio = ({ text }) => {
    const hasPlayed = useRef(false);

    useEffect(() => {
      if (!hasPlayed.current && text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-MX';
        window.speechSynthesis.speak(utterance);
        hasPlayed.current = true;
      }
    }, [text]);
  
    return null;
};
