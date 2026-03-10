/**
 * 이름 충돌 시 자동 넘버링 로직.
 * `file.txt` → `file (1).txt`, `file (1).txt` → `file (2).txt`
 * 디렉토리도 동일 패턴 적용.
 */

/**
 * 대상 디렉토리의 기존 항목 목록에서 충돌 없는 이름을 반환한다.
 * @param name - 원하는 파일/디렉토리 이름
 * @param existingNames - 대상 디렉토리의 기존 항목 이름 목록
 * @returns 충돌 없는 이름 (충돌 없으면 원래 이름 그대로)
 */
export function incrementFileName(name: string, existingNames: string[]): string {
  if (!existingNames.includes(name)) {
    return name
  }

  const existingSet = new Set(existingNames)

  // 확장자 분리: 마지막 '.' 기준
  const dotIndex = name.lastIndexOf('.')
  const hasExtension = dotIndex > 0 // 0이면 숨김 파일(.gitignore 등), -1이면 확장자 없음

  const base = hasExtension ? name.slice(0, dotIndex) : name
  const ext = hasExtension ? name.slice(dotIndex) : ''

  let counter = 1
  for (;;) {
    const candidate = `${base} (${counter})${ext}`
    if (!existingSet.has(candidate)) {
      return candidate
    }
    counter++
  }
}
