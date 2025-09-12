import { Octokit } from '@octokit/rest'
import {
  buildPostMdxRelativePath,
  buildPostMdxRelativePathLocalized,
  type SupportedLocale,
} from '@/shared/config/constants'

export interface CommitImageItem {
  // 리포지토리 기준 경로 (선두 슬래시 금지): e.g. 'public/posts/slug/image.png'
  path: string
  // 원본 바이너리 데이터
  data: Uint8Array
}

export interface CommitToGithubParams {
  slug: string
  // locale별 MDX 파일 목록. (단일 파일 커밋을 위해서는 1개만 전달)
  mdxFiles: { locale?: SupportedLocale; content: string }[]
  images: CommitImageItem[]
}

export async function commitToGithub({
  slug,
  mdxFiles,
  images,
}: CommitToGithubParams) {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH
  const commitMessage = process.env.GITHUB_COMMIT_MESSAGE
  const token = process.env.GITHUB_TOKEN

  if (!owner || !repo || !branch || !commitMessage) {
    throw new Error(
      'Missing required env: GITHUB_OWNER/GITHUB_REPO/GITHUB_BRANCH/GITHUB_COMMIT_MESSAGE',
    )
  }
  if (!token) {
    throw new Error('Missing required env: GITHUB_TOKEN')
  }

  const octokit = new Octokit({ auth: token })

  // 1) 브랜치 ref 조회 (자동 생성은 수행하지 않음)
  const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` })
  const latestCommitSha = ref.data.object.sha

  // 2) 최신 커밋과 트리 조회
  const latestCommit = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  })
  const baseTreeSha = latestCommit.data.tree.sha

  // 3) 블롭 생성 (MDX + 이미지)
  // MDX 파일 경로 (locale 지정 시 suffix, 미지정 시 레거시 경로)
  const mdxBlobs = await Promise.all(
    mdxFiles.map(async (file) => {
      const path = file.locale
        ? buildPostMdxRelativePathLocalized(slug, file.locale)
        : buildPostMdxRelativePath(slug)
      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: file.content,
        encoding: 'utf8',
      })
      return { path, sha: blob.data.sha }
    }),
  )

  const imageBlobs = await Promise.all(
    images.map(async (it) => {
      const b64 = Buffer.from(it.data).toString('base64')
      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: b64,
        encoding: 'base64',
      })
      return { path: it.path, sha: blob.data.sha }
    }),
  )

  // 4) 새 트리 생성
  const tree = [
    ...mdxBlobs.map((b) => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha,
    })),
    ...imageBlobs.map((b) => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha,
    })),
  ]

  const newTree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree,
  })

  // 5) 커밋 생성
  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.data.sha,
    parents: [latestCommitSha],
  })

  // 6) 브랜치 업데이트
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
    force: false,
  })

  return { commitSha: commit.data.sha }
}
