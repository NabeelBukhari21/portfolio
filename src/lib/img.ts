/**
 * Every photo in /public/character, /ventures and /projects also has a 640px "name.sm.webp" copy.
 * Thumbnails, strips, cards and backdrops use it — phones decode full-size images into memory, and
 * dozens of 1600px decodes at once is what makes mobile Safari reload the tab.
 */
export const sm = (src: string) =>
  /^\/(character|ventures|projects)\/[^?#]+\.(webp|jpe?g|png)$/i.test(src) && !src.includes("/locked/") && !src.endsWith(".sm.webp")
    ? src.replace(/\.(webp|jpe?g|png)$/i, ".sm.webp")
    : src;
