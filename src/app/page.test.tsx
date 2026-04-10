import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Home from './page'

// Smoke test — verifica che la Home si renderizzi senza crash
// e che gli elementi fondamentali siano presenti nel DOM.
describe('Home page', () => {
  it('renders without crashing', () => {
    render(<Home />)
    expect(document.body).toBeTruthy()
  })

  it('displays the heading text', () => {
    render(<Home />)
    expect(
      screen.getByRole('heading', { name: /to get started/i })
    ).toBeInTheDocument()
  })
})
