import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

export interface KeyboardState {
  visible: boolean;
  height: number;
}

/** Tracks keyboard visibility and height so screens can keep content in view. */
export const useKeyboard = (): KeyboardState => {
  const [state, setState] = useState<KeyboardState>({ visible: false, height: 0 });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setState({ visible: true, height: event.endCoordinates.height });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setState({ visible: false, height: 0 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return state;
};
