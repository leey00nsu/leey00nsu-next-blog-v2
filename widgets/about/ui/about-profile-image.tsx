import Image from 'next/image'

const ABOUT_PROFILE_IMAGE = {
  SOURCE: '/about/github-profile.jpg',
  ALT: '이윤수 GitHub 프로필 이미지',
  WIDTH: 460,
  HEIGHT: 460,
  SIZE_PX: 160,
} as const

export function AboutProfileImage() {
  return (
    <div className="not-prose mb-8 flex justify-start">
      <div
        className="rounded-full"
        style={{
          width: ABOUT_PROFILE_IMAGE.SIZE_PX,
          height: ABOUT_PROFILE_IMAGE.SIZE_PX,
        }}
      >
        <Image
          src={ABOUT_PROFILE_IMAGE.SOURCE}
          alt={ABOUT_PROFILE_IMAGE.ALT}
          width={ABOUT_PROFILE_IMAGE.WIDTH}
          height={ABOUT_PROFILE_IMAGE.HEIGHT}
          sizes={`${ABOUT_PROFILE_IMAGE.SIZE_PX}px`}
          priority
          className="border-border h-full w-full rounded-full border object-cover"
        />
      </div>
    </div>
  )
}
