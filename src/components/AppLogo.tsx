export function AppLogo({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/app-icon.png"
      alt=""
      className="app-logo"
      width={size}
      height={size}
      draggable={false}
    />
  );
}
