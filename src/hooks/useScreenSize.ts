import { useState, useEffect } from 'react';

const MIN_SCREEN_WIDTH = 1024; // 1024px = lg breakpoint in Tailwind

export const useScreenSize = () => {
  const [isScreenTooSmall, setIsScreenTooSmall] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsScreenTooSmall(width < MIN_SCREEN_WIDTH);
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isScreenTooSmall,
    screenWidth,
    minScreenWidth: MIN_SCREEN_WIDTH
  };
};
