import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/testUtils'
import { ImageViewer } from './ImageViewer'

describe('ImageViewer', () => {
  it('画像がない場合プレースホルダーが表示される', () => {
    render(<ImageViewer image={null} />)

    expect(screen.getByText('画像がありません')).toBeInTheDocument()
  })

  it('画像がある場合img要素が表示される', () => {
    const image = { path: '/path/to/image.jpg', name: 'image.jpg' }
    render(<ImageViewer image={image} />)

    const imgElement = screen.getByRole('img')
    expect(imgElement).toBeInTheDocument()
    expect(imgElement).toHaveAttribute('alt', 'image.jpg')
  })

  it('ファイル名が表示される', () => {
    const image = { path: '/path/to/photo.png', name: 'photo.png' }
    render(<ImageViewer image={image} />)

    expect(screen.getByText('photo.png')).toBeInTheDocument()
  })

  it('ローディング中の場合ローディング表示される', () => {
    const image = { path: '/path/to/image.jpg', name: 'image.jpg' }
    render(<ImageViewer image={image} loading={true} />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('srcにはasset:プロトコルが付与される', () => {
    const image = { path: '/path/to/image.jpg', name: 'image.jpg' }
    render(<ImageViewer image={image} />)

    const imgElement = screen.getByRole('img')
    // Tauri 2.x uses asset: protocol for local files
    expect(imgElement).toHaveAttribute('src', 'asset://localhost/path/to/image.jpg')
  })

  it('nextImageが渡されてもエラーにならない', () => {
    const image = { path: '/path/to/image1.jpg', name: 'image1.jpg' }
    const nextImage = { path: '/path/to/image2.jpg', name: 'image2.jpg' }
    render(<ImageViewer image={image} nextImage={nextImage} />)

    // メイン画像が表示されている
    const imgElement = screen.getByRole('img')
    expect(imgElement).toHaveAttribute('alt', 'image1.jpg')
  })
})
