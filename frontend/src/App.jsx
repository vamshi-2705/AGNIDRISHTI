import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import IntroVideoModal from './components/IntroVideoModal';
import PlatformPage from './pages/PlatformPage';
import DemoPage from './pages/DemoPage';

/**
 * AGNIDRISHTI — Root Application Router
 * 
 * Strict separation between:
 * - /platform : ORIGINAL REAL PLATFORM (authentic NASA FIRMS / VIIRS / real backend data)
 * - /demo     : DEMO PRESENTATION PLATFORM (curated SIH presentation scenario)
 * - /         : Landing page with direct navigation to both
 */
export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    if (hash === '#platform' || path === '/platform') return 'platform';
    if (hash === '#demo' || path === '/demo') return 'demo';
    return 'landing';
  });

  const [showIntroVideo, setShowIntroVideo] = useState(false);

  // Synchronize route with URL pathname and hash (supporting both pushState and hash fallback)
  useEffect(() => {
    const syncViewWithRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash === '#platform' || path === '/platform') {
        setCurrentView('platform');
      } else if (hash === '#demo' || path === '/demo') {
        setCurrentView('demo');
      } else {
        setCurrentView('landing');
      }
    };

    syncViewWithRoute();
    window.addEventListener('popstate', syncViewWithRoute);
    window.addEventListener('hashchange', syncViewWithRoute);

    return () => {
      window.removeEventListener('popstate', syncViewWithRoute);
      window.removeEventListener('hashchange', syncViewWithRoute);
    };
  }, []);

  const handleOpenPlatform = () => {
    setCurrentView('platform');
    try {
      window.history.pushState(null, '', '/platform');
    } catch (e) {}
    window.location.hash = 'platform';
  };

  const handleOpenDemo = () => {
    setCurrentView('demo');
    try {
      window.history.pushState(null, '', '/demo');
    } catch (e) {}
    window.location.hash = 'demo';
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    try {
      window.history.pushState(null, '', '/');
    } catch (e) {}
    window.location.hash = '';
  };

  // 1. Landing View
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage 
          onOpenPlatform={handleOpenPlatform} 
          onOpenDemo={handleOpenDemo}
          onPlayIntro={() => setShowIntroVideo(true)}
        />
        {showIntroVideo && (
          <IntroVideoModal onClose={() => setShowIntroVideo(false)} />
        )}
      </>
    );
  }

  // 2. Demo Presentation Page (/demo)
  if (currentView === 'demo') {
    return (
      <DemoPage
        onBackToLanding={handleBackToLanding}
        onBackToPlatform={handleOpenPlatform}
      />
    );
  }

  // 3. Original Real Platform (/platform)
  return (
    <PlatformPage
      onBackToLanding={handleBackToLanding}
      onOpenDemo={handleOpenDemo}
    />
  );
}
