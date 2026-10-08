/** Tiny shared flags between the WebGL layers so only one heavy scene renders at a time. */
export const stage = {
  /** full-screen scenes currently covering the viewport (the background face fades out and pauses) */
  covers: { reel: false, system: false, section: false } as Record<string, boolean>,
  get faceCovered() {
    return Object.values(this.covers).some(Boolean);
  },
};
