/* eslint-disable react/prop-types -- plain JS project, no prop-types package installed */

// A shimmering placeholder block. Polaris web components (s-*) don't ship a
// skeleton primitive, so this is a plain div sized/shaped per use site and
// dropped inside the existing s-box/s-stack/s-grid layout components.
export default function SkeletonBox({ width = "100%", height = "16px", radius = "6px", style }) {
  return (
    <div
      className="skeleton-block"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}
