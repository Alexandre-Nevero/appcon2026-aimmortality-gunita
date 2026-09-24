export function FlowerMark({ size = 48 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small decorative inline mark, not worth next/image's layout overhead
    <img
      src="/objects/flower.png"
      width={size}
      height={size}
      alt=""
      style={{ display: "inline-block", verticalAlign: "middle", objectFit: "contain" }}
    />
  );
}
