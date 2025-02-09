import { render, screen, fireEvent } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render landing page initially', () => {
    render(<App />);
    expect(screen.getByText(/Welcome to Live Streaming Studio!/i)).toBeTruthy();
  });

  it('should switch to streamer interface when start button is clicked', () => {
    render(<App />);
    const startButton = screen.getByText(/Start Streaming/i);
    fireEvent.click(startButton);
    expect(screen.getByText(/Preview Settings/i)).toBeTruthy();
  });
});
