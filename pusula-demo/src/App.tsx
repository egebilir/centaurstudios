import React, { useState } from 'react';
import { InputScreen } from './components/InputScreen';
import { ResultScreen } from './components/ResultScreen';
import { LoadingState } from './components/LoadingState';
import { fetchVerse, type VerseResponse } from './services/api';

function App() {
  const [verse, setVerse] = useState<VerseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmotionSubmit = async (emotion: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchVerse(emotion);
      setVerse(response);
    } catch (err) {
      console.error('Failed to fetch verse:', err);
      setError('Bağlantı sorunu, lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setVerse(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-primary text-white selection:bg-accent selection:text-primary">
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingState />
        </div>
      ) : verse ? (
        <ResultScreen verse={verse} onBack={handleBack} />
      ) : (
        <InputScreen onSubmit={handleEmotionSubmit} isLoading={isLoading} />
      )}
      
      {error && !isLoading && !verse && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg flex flex-col items-center gap-3">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-sm underline hover:text-gray-200"
          >
            Kapat
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
