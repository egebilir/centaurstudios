import React, { useState } from 'react';

interface InputScreenProps {
  onSubmit: (emotion: string) => void;
  isLoading: boolean;
}

export const InputScreen: React.FC<InputScreenProps> = ({ onSubmit, isLoading }) => {
  const [emotion, setEmotion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emotion.trim() && !isLoading) {
      onSubmit(emotion.trim());
    }
  };

  const appStoreLink = import.meta.env.VITE_APP_STORE_LINK || 'https://apps.apple.com/tr/app/pusula-quran-verses-prayers/id6786255399';

  return (
    <div className="flex flex-col min-h-screen max-w-[600px] mx-auto w-full p-6 pt-12 md:pt-20 relative">
      <div className="flex flex-col items-center justify-center flex-grow">
        <img 
          src="/logo.jpg" 
          alt="Pusula Logo" 
          className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl mb-8 object-cover border-4 border-accent/30"
        />
        <h1 className="font-serif text-[32px] md:text-4xl text-accent font-bold text-center mb-2 tracking-wide">
          Nasıl hissediyorsun?
        </h1>
        <p className="text-sm text-gray-300 text-center mb-10 tracking-wider font-medium">
          May peace fill your heart
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <textarea
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            placeholder="Hissettiklerini yaz ve sana uygun bir ayet bulalım..."
            className="w-full bg-[rgba(26,58,54,0.5)] border border-accent/40 rounded-xl p-5 text-white placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none shadow-inner text-base md:text-lg min-h-[160px] transition-all"
            rows={4}
            disabled={isLoading}
          />
          
          <button
            type="submit"
            disabled={!emotion.trim() || isLoading}
            className="w-full bg-accent text-primary font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? 'Ayeti bulunuyor...' : 'Ayet Bul'}
          </button>
        </form>
      </div>

      <div className="mt-auto pt-8 pb-4 text-center">
        <a 
          href={appStoreLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-accent hover:text-white transition-colors text-sm font-medium border-b border-accent hover:border-white pb-0.5"
        >
          Tüm özellikler için uygulamayı indir →
        </a>
      </div>
    </div>
  );
};
