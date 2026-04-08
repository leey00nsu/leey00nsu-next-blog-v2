import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const configMock = vi.fn()

vi.mock('dotenv', () => {
  return {
    default: {
      config: configMock,
    },
  }
})

describe('loadNodeEnvironment', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('모듈 import 시 현재 작업 디렉터리의 Next 환경변수를 로드한다', async () => {
    await import('@/shared/lib/load-node-environment')

    expect(configMock).toHaveBeenNthCalledWith(1, {
      path: path.resolve(process.cwd(), '.env'),
    })
    expect(configMock).toHaveBeenNthCalledWith(2, {
      path: path.resolve(process.cwd(), '.env.local'),
      override: true,
    })
  })
})
