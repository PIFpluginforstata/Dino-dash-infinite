import React from 'react';
import GameCanvas from './GameCanvas';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="mb-4 text-center">
        <h1 className="text-3xl md:text-5xl text-yellow-400 font-bold mb-2 drop-shadow-md">
          DINO DASH INFINITE
        </h1>
        <p className="text-gray-400 text-sm">
          Survive as long as you can. Level up every 15s.
        </p>
      </div>
      
      <GameCanvas />
      
      <div className="mt-8 max-w-2xl text-center text-gray-500 text-xs leading-5">
        <p>Built with React & HTML5 Canvas.</p>
        <p>Assets provided by rendit.io.</p>
      </div>
    </div>
  );
}

export default App;
