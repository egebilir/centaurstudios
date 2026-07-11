export interface VerseResponse {
  verseId: string;
  arabic: string;
  turkish: string;
  commentary: string;
  audioUrl: string;
  ref: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://pusulaapp-production.up.railway.app';

export async function fetchVerse(emotion: string): Promise<VerseResponse> {
  const response = await fetch(`${API_URL}/api/verse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: emotion })
  });
  
  const data = await response.json();
  
  return {
    verseId: data.verse?.id || '',
    arabic: data.verse?.arabic || '',
    turkish: data.verse?.turkish || '',
    commentary: data.commentary || data.verse?.commentary || '',
    audioUrl: data.verse?.audioUrl || '', // May be missing
    ref: data.verse?.ref || ''
  };
}
