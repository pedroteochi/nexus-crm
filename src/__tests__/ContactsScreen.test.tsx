import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ContactsScreen from '@/app/(tabs)/contacts';
import { useCrmStore } from '@/store/crmStore';
import { generateSeed } from '@/utils/seed';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't reference out-of-scope imports; require is the canonical pattern.
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Synchronous safe-area metrics so useSafeAreaInsets resolves without measurement.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ContactsScreen />
    </SafeAreaProvider>,
  );

describe('ContactsScreen form validation', () => {
  beforeEach(() => {
    useCrmStore.setState({ ...generateSeed(), hasHydrated: true });
  });

  it('shows field errors when saving an empty contact form', () => {
    renderScreen();

    // Open the "new contact" modal from the header action.
    fireEvent.press(screen.getByLabelText('Adicionar contato'));

    // Submit with every field empty.
    fireEvent.press(screen.getByText('Salvar contato'));

    expect(screen.getByText('Informe o nome.')).toBeTruthy();
    expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
    expect(screen.getByText('Selecione uma empresa.')).toBeTruthy();
  });
});
