import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';

describe('[FR-ONB-001] onboarding shell', () => {
  it('renders the main hero heading and skip link', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /plan your day/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
  });

  it('builds a plan from event inputs and keeps the total budget aligned', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText(/^budget$/i));
    await user.type(screen.getByLabelText(/^budget$/i), '1500000');
    await user.clear(screen.getByLabelText(/^guests$/i));
    await user.type(screen.getByLabelText(/^guests$/i), '250');

    await user.click(screen.getByRole('button', { name: /wedding/i }));

    expect(screen.getByText(/budget status/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /₹ 15,00,000/i })).toBeInTheDocument();
    expect(screen.getAllByText(/250\s+guests/i).length).toBeGreaterThan(0);
  });
});
