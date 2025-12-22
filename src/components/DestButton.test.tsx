import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/testUtils'
import { DestButton } from './DestButton'

describe('DestButton', () => {
  it('キー番号が表示される', () => {
    render(<DestButton keyNum="1" path={null} onSelect={() => {}} />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('パスが未設定の場合「未設定」と表示される', () => {
    render(<DestButton keyNum="1" path={null} onSelect={() => {}} />)

    expect(screen.getByText('未設定')).toBeInTheDocument()
  })

  it('パスが設定されている場合フォルダ名が表示される', () => {
    render(
      <DestButton
        keyNum="2"
        path="/Users/test/Documents/Photos"
        onSelect={() => {}}
      />
    )

    expect(screen.getByText('Photos')).toBeInTheDocument()
  })

  it('クリックでonSelectが呼ばれる', () => {
    const onSelect = vi.fn()
    render(<DestButton keyNum="3" path={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('disabledの場合クリックできない', () => {
    const onSelect = vi.fn()
    render(
      <DestButton keyNum="4" path={null} onSelect={onSelect} disabled={true} />
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('activeの場合、視覚的に強調される', () => {
    render(
      <DestButton keyNum="5" path="/path/dest" onSelect={() => {}} active={true} />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('active')
  })

  it('右クリックでonClearが呼ばれる（パスが設定されている場合）', async () => {
    const onClear = vi.fn()
    render(
      <DestButton
        keyNum="1"
        path="/Users/test/Documents"
        onSelect={() => {}}
        onClear={onClear}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.contextMenu(button)
    await waitFor(() => {
      expect(onClear).toHaveBeenCalledTimes(1)
    })
  })

  it('パスが未設定の場合、右クリックでonClearが呼ばれない', () => {
    const onClear = vi.fn()
    render(
      <DestButton
        keyNum="1"
        path={null}
        onSelect={() => {}}
        onClear={onClear}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.contextMenu(button)
    expect(onClear).not.toHaveBeenCalled()
  })
})
