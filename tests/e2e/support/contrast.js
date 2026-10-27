/* WCAG's relative luminance of an sRGB colour, with each channel from 0 to 255 */
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/* The ratio WCAG sets its minimums in, from 1 for two equal colours up to 21 for black on white */
export const contrastRatio = (a, b) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

/* Lays a colour with an alpha over a solid one, as the browser paints it */
export const blend = ([r, g, b, alpha = 1], under) => [r, g, b].map((channel, i) => channel * alpha + under[i] * (1 - alpha));

/* Reads one pixel of the screen, decoded in the page itself so the specs need no image library */
export const pixelAt = async (page, x, y) => {
  const png = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, png.toString('base64'));
};