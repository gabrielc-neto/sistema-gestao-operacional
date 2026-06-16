const ASSET_VERSION = "20260616-1022";

export default function LogoPontual({ height = 60, variant = "color" }) {
  const base = variant === "white" ? "/pontual-logo-white.png" : "/pontual-logo.png";
  const src = `${base}?v=${ASSET_VERSION}`;
  return (
    <img
      src={src}
      alt="Pontual"
      height={height}
      style={{ display: "block", height, width: "auto" }}
    />
  );
}
