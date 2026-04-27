import { useEffect, useState } from 'react';

/** Narrow phone-style viewports: schedule-first shell, no sidebar. */
const MEDIA = '(max-width: 480px)';

export function usePhonePortraitLayout(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MEDIA).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(MEDIA);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return matches;
}
