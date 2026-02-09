import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RoleSelectionSection } from '../../../components/roles/RoleSelectionSection';

describe('RoleSelectionSection', () => {
  it('renders cards and opens info modal with services hint', () => {
    const onSelectRole = jest.fn();
    const { getByText, getByTestId, queryByText } = render(
      <RoleSelectionSection selectedRole="user" onSelectRole={onSelectRole} />
    );

    expect(getByText('Роль в портале')).toBeTruthy();
    expect(getByText('Искатель')).toBeTruthy();

    expect(queryByText('Этим сервисам вы получите приоритет в портале:')).toBeNull();
    fireEvent.press(getByTestId('role-help-user'));
    expect(getByText('Этим сервисам вы получите приоритет в портале:')).toBeTruthy();
  });

  it('changes selected role on card press', () => {
    const onSelectRole = jest.fn();
    const { getByTestId } = render(
      <RoleSelectionSection selectedRole="user" onSelectRole={onSelectRole} />
    );

    fireEvent.press(getByTestId('role-card-devotee'));
    expect(onSelectRole).toHaveBeenCalledWith('devotee');
  });
});
