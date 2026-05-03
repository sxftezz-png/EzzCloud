import React from 'react';

// EzzCloud build: Star subscription / paywall removed entirely. The original
// upstream renders an animated paywall overlay above SoundWave for free users
// — we always render nothing instead so the wave is unlocked unconditionally.
export const SoundWaveLockOverlay = React.memo(function SoundWaveLockOverlay() {
  return null;
});
