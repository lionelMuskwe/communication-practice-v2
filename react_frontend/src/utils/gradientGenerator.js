/**
 * Generates deterministic gradient colors based on a UUID.
 * Same UUID always produces same gradient.
 */
export const generateGradient = (uuid) => {
  // Use UUID to seed color generation
  const hash = uuid.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Generate two colors with fixed starting hue ranges
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360; // 60 degrees apart for harmony

  const saturation = 70; // Fixed saturation for consistency
  const lightness1 = 60;
  const lightness2 = 75;

  const color1 = `hsl(${hue1}, ${saturation}%, ${lightness1}%)`;
  const color2 = `hsl(${hue2}, ${saturation}%, ${lightness2}%)`;

  return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
};
