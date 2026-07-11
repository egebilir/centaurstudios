import React from 'react';
import { ArrowLeftIcon, ShareIcon, HeartIcon, HeartSolidIcon } from './Icons';
import { AudioPlayer } from './AudioPlayer';
import type { VerseResponse } from '../services/api';

interface ResultScreenProps {
  verse: VerseResponse;
  onBack: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ verse, onBack }) => {
  const [isFavorite, setIsFavorite] = React.useState(false);

  const handleShare = async () => {
    const shareText = `Bismillahirrahmanirrahim\n\n${verse.arabic}\n\n${verse.turkish}\n\n— Pusula: Kur'an, Ayet ve Dua`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pusula: Kur\'an, Ayet ve Dua',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Ayet kopyalandı!');
    }
  };

  const appStoreLink = import.meta.env.VITE_APP_STORE_LINK || 'https://apps.apple.com/tr/app/pusula-quran-verses-prayers/id6786255399';

  return (
    <div className="flex flex-col min-h-screen max-w-[600px] mx-auto w-full p-4 relative pt-6 pb-24">
      {/* Header Row */}
      <div className="flex items-center justify-between w-full mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-border-color rounded-full transition-colors"
          aria-label="Geri dön"
        >
          <ArrowLeftIcon />
        </button>
        <button 
          onClick={handleShare}
          className="p-2 hover:bg-border-color rounded-full transition-colors"
          aria-label="Paylaş"
        >
          <ShareIcon />
        </button>
      </div>

      {/* Audio Player and Verse */}
      <AudioPlayer arabic={verse.arabic} audioUrl={verse.audioUrl} />

      {/* Translation */}
      <div className="text-center italic text-base md:text-lg mb-2 px-4 leading-relaxed">
        "{verse.turkish}"
      </div>
      
      {/* Reference */}
      <div className="text-right text-xs md:text-sm text-gray-400 mb-8 px-4 font-medium tracking-wide">
        {verse.ref}
      </div>

      {/* Commentary Box */}
      <div className="bg-border-color rounded-xl p-5 mb-8">
        <h3 className="font-bold text-accent mb-3 flex items-center gap-2">
          <span>🕌</span> Pusula Yorumu
        </h3>
        <p className="text-sm md:text-base leading-relaxed">
          {verse.commentary}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 w-full mt-auto">
        <div className="flex gap-4">
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-accent text-accent rounded-lg hover:bg-[rgba(212,175,138,0.1)] transition-colors font-medium"
          >
            {isFavorite ? <HeartSolidIcon className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
            Favorilere Ekle
          </button>
          <button 
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-accent text-accent rounded-lg hover:bg-[rgba(212,175,138,0.1)] transition-colors font-medium"
          >
            <ShareIcon className="w-5 h-5" />
            Paylaş
          </button>
        </div>
        
        <a 
          href={appStoreLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (window.fbq) {
              window.fbq('track', 'AddToWishlist', { content_name: 'Download Pusula App' });
            }
          }}
          className="w-full bg-accent text-primary font-bold py-4 px-6 rounded-lg text-center hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
        >
          Tüm özellikler için uygulamayı indir
          <span className="text-lg">→</span>
        </a>
      </div>
    </div>
  );
};
