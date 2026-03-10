import { describe, expect, it } from 'vitest'
import { incrementFileName } from './increment-file-name'

describe('incrementFileName', () => {
  it('이미 충돌이 없는 경우 원래 이름 반환', () => {
    expect(incrementFileName('file.txt', [])).toBe('file.txt')
    expect(incrementFileName('file.txt', ['other.txt'])).toBe('file.txt')
  })

  it('확장자 있는 파일 충돌 시 (1) 붙이기', () => {
    expect(incrementFileName('file.txt', ['file.txt'])).toBe('file (1).txt')
  })

  it('(1)도 충돌 시 (2) 붙이기', () => {
    expect(incrementFileName('file.txt', ['file.txt', 'file (1).txt'])).toBe('file (2).txt')
  })

  it('확장자 없는 디렉토리 충돌 시 (1) 붙이기', () => {
    expect(incrementFileName('dir', ['dir'])).toBe('dir (1)')
  })

  it('확장자 없는 디렉토리 (1)도 충돌 시 (2) 붙이기', () => {
    expect(incrementFileName('dir', ['dir', 'dir (1)'])).toBe('dir (2)')
  })

  it('이미 넘버링된 파일 이름도 충돌 처리', () => {
    expect(incrementFileName('file (1).txt', ['file (1).txt'])).toBe('file (1) (1).txt')
  })

  it('연속된 여러 충돌 처리', () => {
    expect(
      incrementFileName('file.txt', ['file.txt', 'file (1).txt', 'file (2).txt'])
    ).toBe('file (3).txt')
  })

  it('확장자가 여러 개인 파일 처리 (.tar.gz 등)', () => {
    // 마지막 확장자 앞에 번호 삽입
    expect(incrementFileName('archive.tar.gz', ['archive.tar.gz'])).toBe('archive.tar (1).gz')
  })
})
