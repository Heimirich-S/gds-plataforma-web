/* Fallback visual para imágenes de personal que no cargan. */
function gdsAvatar(img, size) {
  size = size || 80;
  const name = img.alt || '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
  const palette = ['#0a2e5c', '#0090c8', '#1a5276', '#117a65', '#6c3483', '#784212', '#1f618d'];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash * 32) - hash);
  }
  const color = palette[Math.abs(hash) % palette.length];
  const half = size / 2;
  const fontSize = Math.round(size * 0.36);
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<circle cx="' + half + '" cy="' + half + '" r="' + half + '" fill="' + color + '"/>' +
    '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="' + fontSize + '" font-weight="700" fill="#fff">' + initials + '</text>' +
    '</svg>'
  );
  img.onerror = null;
}

window.gdsAvatar = gdsAvatar;