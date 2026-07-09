import { fireEvent, render, screen } from '@testing-library/react-native';

import { ContactListItem } from '@/components/ContactListItem';

describe('ContactListItem', () => {
  const baseProps = {
    contactId: 'c1',
    name: 'Ana Costa',
    subtitle: 'Gerente · Acme',
    onPress: jest.fn(),
    onOpenChat: jest.fn(),
  };

  it('renders the contact name and subtitle', () => {
    render(<ContactListItem {...baseProps} />);
    expect(screen.getByText('Ana Costa')).toBeTruthy();
    expect(screen.getByText('Gerente · Acme')).toBeTruthy();
  });

  it('opens the chat with the contact id when the message action is pressed', () => {
    const onOpenChat = jest.fn();
    render(<ContactListItem {...baseProps} onOpenChat={onOpenChat} />);

    fireEvent.press(screen.getByLabelText('Mensagem para Ana Costa'));

    expect(onOpenChat).toHaveBeenCalledWith('c1');
  });

  it('opens the detail with the contact id when the row is pressed', () => {
    const onPress = jest.fn();
    render(<ContactListItem {...baseProps} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText('Abrir Ana Costa'));

    expect(onPress).toHaveBeenCalledWith('c1');
  });
});
