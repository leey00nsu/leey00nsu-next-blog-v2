interface AudioSampleProps {
  title: string
  description: string
  src: string
}

export function AudioSample({
  title,
  description,
  src,
}: AudioSampleProps) {
  return (
    <figure className="not-prose my-8 rounded-lg border bg-muted/30 p-4 sm:p-5">
      <figcaption className="mb-4">
        <strong className="block text-sm font-semibold text-foreground">
          {title}
        </strong>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </figcaption>
      <audio
        aria-label={title}
        className="block w-full"
        controls
        preload="metadata"
        src={src}
      >
        <a href={src}>음성 파일 열기</a>
      </audio>
    </figure>
  )
}
