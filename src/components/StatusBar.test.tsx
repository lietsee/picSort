import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'

describe('StatusBar', () => {
  it('カウンターが正しく表示される', () => {
    render(<StatusBar current={5} total={100} message="" />)

    expect(screen.getByText('5 / 100')).toBeInTheDocument()
  })

  it('total が 0 の場合「0 / 0」と表示される', () => {
    render(<StatusBar current={0} total={0} message="" />)

    expect(screen.getByText('0 / 0')).toBeInTheDocument()
  })

  it('メッセージがある場合表示される', () => {
    render(<StatusBar current={1} total={10} message="ファイルを移動しました" />)

    expect(screen.getByText('ファイルを移動しました')).toBeInTheDocument()
  })

  it('メッセージが空の場合は表示されない', () => {
    render(<StatusBar current={1} total={10} message="" />)

    const messageElement = screen.queryByTestId('status-message')
    expect(messageElement).not.toBeInTheDocument()
  })

  it('status が error の場合エラースタイルが適用される', () => {
    render(
      <StatusBar
        current={1}
        total={10}
        message="エラーが発生しました"
        status="error"
      />
    )

    const statusBar = screen.getByTestId('status-bar')
    expect(statusBar).toHaveClass('status-error')
  })

  it('status が success の場合成功スタイルが適用される', () => {
    render(
      <StatusBar
        current={1}
        total={10}
        message="完了しました"
        status="success"
      />
    )

    const statusBar = screen.getByTestId('status-bar')
    expect(statusBar).toHaveClass('status-success')
  })
})
