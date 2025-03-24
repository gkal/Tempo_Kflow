import { useEffect } from 'react';

/**
 * A hook that runs the effect only on mount (when the component mounts).
 * This is equivalent to useEffect with an empty dependency array.
 * 
 * @param effect - The effect callback to run
 */
export const useMountEffect = (effect: () => void | (() => void)) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}; 