import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Poll only the visible screen; foregrounding the app checks officer changes immediately.
export default function useTicketAutoRefresh(refresh: () => Promise<void>) {
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let pending = false;
      let previousState = AppState.currentState;
      const run = async () => {
        if (
          !active ||
          pending ||
          (AppState.currentState && AppState.currentState !== 'active')
        )
          return;
        pending = true;
        try {
          await refresh();
        } catch {
          /* Screen loaders display actionable errors. */
        } finally {
          pending = false;
        }
      };
      const timer = setInterval(() => {
        void run();
      }, 15000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active' && previousState !== 'active') void run();
        previousState = state;
      });
      return () => {
        active = false;
        clearInterval(timer);
        subscription.remove();
      };
    }, [refresh])
  );
}
