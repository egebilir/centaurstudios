import React from 'react';

export const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-6">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-border-color rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-accent rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-accent text-lg font-medium animate-pulse">Ayeti bulunuyor...</p>
    </div>
  );
};
