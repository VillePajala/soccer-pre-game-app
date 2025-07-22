import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n.test';
import UpdateBanner from './UpdateBanner';

describe('UpdateBanner', () => {
  it('renders release notes when provided', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <UpdateBanner onUpdate={() => {}} notes="Some fixes" />
      </I18nextProvider>
    );
    expect(screen.getByText('Some fixes')).toBeInTheDocument();
  });

  it('does not render notes when not provided', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <UpdateBanner onUpdate={() => {}} />
      </I18nextProvider>
    );
    expect(screen.queryByText('Some fixes')).not.toBeInTheDocument();
  });

  it('hides banner when dismissed', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <UpdateBanner onUpdate={() => {}} />
      </I18nextProvider>
    );
    const button = screen.getByRole('button', { name: /dismiss/i });
    button.click();
    expect(screen.queryByText(/new version/i)).not.toBeInTheDocument();
  });
});
