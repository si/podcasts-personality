import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders upload heading', () => {
  render(<App />);
  const heading = screen.getByText(/Upload Your Podcast OPML/i);
  expect(heading).toBeInTheDocument();
});
