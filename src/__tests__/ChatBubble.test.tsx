import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChatBubble } from '@/components/ChatBubble';
import type { Message } from '@/types/models';

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  chatId: 'chat1',
  role: 'user',
  text: 'Olá!',
  createdAt: 1_700_000_000_000,
  status: 'sent',
  ...overrides,
});

describe('ChatBubble', () => {
  it('renders the message text', () => {
    render(<ChatBubble message={makeMessage({ text: 'Bom dia' })} />);
    expect(screen.getByText('Bom dia')).toBeTruthy();
  });

  it('shows the error reason and a retry affordance for a failed user message', () => {
    const onRetry = jest.fn();
    render(
      <ChatBubble
        message={makeMessage({ status: 'error', errorReason: 'Sem conexão' })}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Sem conexão')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Tentar enviar de novo'));
    expect(onRetry).toHaveBeenCalledWith('m1');
  });

  it('does not offer retry when no onRetry handler is provided', () => {
    render(<ChatBubble message={makeMessage({ status: 'error', errorReason: 'Falhou' })} />);

    expect(screen.getByText('Falhou')).toBeTruthy();
    expect(screen.queryByLabelText('Tentar enviar de novo')).toBeNull();
  });
});
