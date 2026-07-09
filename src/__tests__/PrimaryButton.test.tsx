import { fireEvent, render, screen } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders its label and fires onPress when enabled', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Salvar contato" onPress={onPress} />);

    fireEvent.press(screen.getByText('Salvar contato'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress while disabled', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Salvar" onPress={onPress} disabled />);

    fireEvent.press(screen.getByLabelText('Salvar'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('marks itself busy for screen readers while loading', () => {
    render(<PrimaryButton label="Salvar" onPress={jest.fn()} loading />);

    const button = screen.getByLabelText('Salvar');
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });
});
