import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeModal } from './WelcomeModal'

describe('WelcomeModal', () => {
  it('isOpenがfalseの場合何も表示されない', () => {
    render(
      <WelcomeModal isOpen={false} onClose={() => {}} onDontShowAgain={() => {}} />
    )

    expect(screen.queryByText('picSort へようこそ')).not.toBeInTheDocument()
  })

  it('isOpenがtrueの場合モーダルが表示される', () => {
    render(
      <WelcomeModal isOpen={true} onClose={() => {}} onDontShowAgain={() => {}} />
    )

    expect(screen.getByText('picSort へようこそ')).toBeInTheDocument()
    expect(screen.getByText('基本操作')).toBeInTheDocument()
    expect(screen.getByText('キーボードショートカット')).toBeInTheDocument()
  })

  it('「始める」ボタンでonCloseが呼ばれる', () => {
    const onClose = vi.fn()
    render(
      <WelcomeModal isOpen={true} onClose={onClose} onDontShowAgain={() => {}} />
    )

    fireEvent.click(screen.getByText('始める'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('「次回から表示しない」でonDontShowAgainとonCloseが呼ばれる', () => {
    const onClose = vi.fn()
    const onDontShowAgain = vi.fn()
    render(
      <WelcomeModal isOpen={true} onClose={onClose} onDontShowAgain={onDontShowAgain} />
    )

    fireEvent.click(screen.getByText('次回から表示しない'))
    expect(onDontShowAgain).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('オーバーレイクリックでonCloseが呼ばれる', () => {
    const onClose = vi.fn()
    render(
      <WelcomeModal isOpen={true} onClose={onClose} onDontShowAgain={() => {}} />
    )

    // modal-overlay をクリック
    const overlay = document.querySelector('.modal-overlay')
    if (overlay) {
      fireEvent.click(overlay)
    }
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('モーダルコンテンツクリックでは閉じない', () => {
    const onClose = vi.fn()
    render(
      <WelcomeModal isOpen={true} onClose={onClose} onDontShowAgain={() => {}} />
    )

    // modal-content をクリック（stopPropagation）
    const content = document.querySelector('.modal-content')
    if (content) {
      fireEvent.click(content)
    }
    expect(onClose).not.toHaveBeenCalled()
  })
})
