/**
 * LeesField 이미지 생성 프로바이더
 *
 * leesfield.leey00nsu.com API를 사용하여 이미지를 생성합니다.
 * 비동기 폴링 방식으로 결과를 조회합니다.
 */

import type {
  ImageGenerationProvider,
  ImageGenerationOptions,
  ImageResult,
} from '@/features/editor/model/image-generation-types'

const LEESFIELD_API_BASE = 'https://leesfield.leey00nsu.com'
const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 1024
const DEFAULT_STEPS = 9
const DEFAULT_IMAGE_COUNT = 1
const MODEL = 'z-image-turbo'

/** 폴링 간격 (ms) */
const POLL_INTERVAL = 2000
/** 최대 폴링 시간 (ms) - 2분 */
const MAX_POLL_TIME = 120_000

interface LeesFieldGenerationResponse {
  requestId: string
  status: string
  progress: number
}

interface LeesFieldResultResponse {
  requestId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: {
    images: Array<{
      url: string
      width?: number
      height?: number
    }>
  }
  errorMessage?: string
}

export class LeesFieldProvider implements ImageGenerationProvider {
  private readonly apiKey: string

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.LEESFIELD_API_KEY
    if (!key) {
      throw new Error('LEESFIELD_API_KEY is not configured')
    }
    this.apiKey = key
  }

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageResult[]> {
    const width = options?.width ?? DEFAULT_WIDTH
    const height = options?.height ?? DEFAULT_HEIGHT
    const imageCount = options?.imageCount ?? DEFAULT_IMAGE_COUNT

    // 1. 이미지 생성 요청
    const requestId = await this.requestGeneration(
      prompt,
      width,
      height,
      imageCount,
    )

    // 2. 결과 폴링
    const result = await this.pollForResult(requestId)

    return (
      result.result?.images.map((img) => ({
        url: img.url,
        width: img.width ?? width,
        height: img.height ?? height,
      })) ?? []
    )
  }

  private async requestGeneration(
    prompt: string,
    width: number,
    height: number,
    imageCount: number,
  ): Promise<string> {
    const formData = new FormData()
    formData.append('prompt', prompt)
    formData.append('width', String(width))
    formData.append('height', String(height))
    formData.append('model', MODEL)
    formData.append('imageCount', String(imageCount))
    formData.append('steps', String(DEFAULT_STEPS))

    const response = await fetch(
      `${LEESFIELD_API_BASE}/api/external/image-generation`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
        },
        body: formData,
      },
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        error.message ?? `Image generation request failed: ${response.status}`,
      )
    }

    const data: LeesFieldGenerationResponse = await response.json()
    return data.requestId
  }

  private async pollForResult(
    requestId: string,
  ): Promise<LeesFieldResultResponse> {
    const startTime = Date.now()

    while (Date.now() - startTime < MAX_POLL_TIME) {
      const response = await fetch(
        `${LEESFIELD_API_BASE}/api/external/image-generation/${requestId}`,
        {
          headers: {
            'X-API-Key': this.apiKey,
          },
        },
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          error.message ?? `Failed to poll result: ${response.status}`,
        )
      }

      const data: LeesFieldResultResponse = await response.json()

      if (data.status === 'completed') {
        return data
      }

      if (data.status === 'failed') {
        throw new Error(data.errorMessage ?? 'Image generation failed')
      }

      // 대기 후 다시 폴링
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
    }

    throw new Error('Image generation timed out')
  }
}
