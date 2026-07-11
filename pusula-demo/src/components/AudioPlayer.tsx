import React, { useRef, useState, useEffect } from 'react';
import { PlayIcon, PauseIcon } from './Icons';

interface AudioPlayerProps {
  arabic: string;
  audioUrl: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ arabic, audioUrl }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setHighlightedWordIndex(-1);
      if (!audioUrl) {
        setHasError(true);
      } else {
        setHasError(false);
      }
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (hasError) return;
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setHasError(true));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 0;
      setCurrentTime(current);

      if (total > 0 && isPlaying) {
        const words = arabic.split(' ');
        const wordsPerSecond = words.length / total;
        const index = Math.floor(current * wordsPerSecond);
        // Ensure index doesn't exceed word count
        setHighlightedWordIndex(Math.min(index, words.length - 1));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setHighlightedWordIndex(-1);
    setCurrentTime(0);
  };

  const handleError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const arabicWords = (arabic || '').split(' ');
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center w-full my-6">
      <div className="arabic-verse mb-8 max-w-full px-4" dir="rtl">
        {arabicWords.map((word, idx) => (
          <span
            key={idx}
            className={idx === highlightedWordIndex ? 'highlight' : ''}
          >
            {word}{' '}
          </span>
        ))}
      </div>

      {!hasError && (
        <div className="flex items-center w-full max-w-sm gap-4 px-4">
          <button
            onClick={togglePlay}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-accent text-primary rounded-full hover:scale-105 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          
          <div className="flex-grow flex items-center gap-3">
            <div className="relative flex-grow h-2 bg-border-color rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-accent transition-all duration-100 ease-linear"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="text-sm font-medium w-12 text-right">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>
      )}

      {hasError && (
        <div className="text-sm text-red-400 mt-2 px-4 text-center">
          Ses dosyası yüklenemedi, ancak ayeti okuyabilirsiniz.
        </div>
      )}

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        className="hidden"
      />
    </div>
  );
};
