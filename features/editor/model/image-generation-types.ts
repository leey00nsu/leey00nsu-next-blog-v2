/**
 * 이미지 생성 프로바이더 인터페이스 및 관련 타입
 *
 * 어댑터 패턴을 적용하여 다양한 이미지 생성 API를 지원합니다.
 */

export interface ImageGenerationOptions {
  /** 이미지 너비 (픽셀) */
  width?: number
  /** 이미지 높이 (픽셀) */
  height?: number
  /** 생성할 이미지 개수 */
  imageCount?: number
}

export interface ImageResult {
  /** 생성된 이미지 URL */
  url: string
  /** 이미지 너비 */
  width: number
  /** 이미지 높이 */
  height: number
}

/**
 * 이미지 생성 프로바이더 인터페이스
 *
 * 다른 이미지 생성 API를 추가할 때 이 인터페이스를 구현합니다.
 */
export interface ImageGenerationProvider {
  /**
   * 프롬프트를 기반으로 이미지를 생성합니다.
   *
   * @param prompt - 이미지 설명 텍스트
   * @param options - 생성 옵션 (크기, 개수 등)
   * @returns 생성된 이미지 배열
   */
  generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageResult[]>
}
