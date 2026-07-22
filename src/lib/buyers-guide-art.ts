// Buyer's Guide image slots. Fill each `src` with the final image URL
// (or /assets/... path after localization). Empty src = styled placeholder
// renders instead, so the page ships before art is ready.
// Prompt for each slot lives in Campaigns/buyers-guide-image-prompts.md.

export interface GuideArt {
  src: string;
  alt: string;
  ratio: '16/9' | '1/1';
}

export const GUIDE_ART: Record<string, GuideArt> = {
  hero: { src: '', alt: 'Glass compass resting on insurance documents under a navy studio spotlight', ratio: '16/9' },
  'lesson-ceiling': { src: '', alt: 'Two glass pillars of different heights representing premium versus out-of-pocket ceiling', ratio: '16/9' },
  'lesson-network': { src: '', alt: 'Glowing map of connected clinic nodes with one node outside the boundary', ratio: '16/9' },
  'lesson-toolbox': { src: '', alt: 'Open glass toolbox with six distinct glowing instruments, one per coverage line', ratio: '16/9' },
  'lesson-timing': { src: '', alt: 'Glass hourglass beside a calendar etched in light showing enrollment windows', ratio: '16/9' },
  'lesson-conversation': { src: '', alt: 'Two glass chairs facing each other under a warm spotlight, no desk between them', ratio: '16/9' },
  health: { src: '', alt: 'Crystal shield with a plus sign over a family silhouette in navy studio light', ratio: '1/1' },
  life: { src: '', alt: 'Glass tree with golden roots sheltering small house and family figures', ratio: '1/1' },
  gap: { src: '', alt: 'Glass bridge closing the gap between two cliff edges lit in cyan', ratio: '1/1' },
  medicare: { src: '', alt: 'Four interlocking glass segments forming a circle, one segment gold', ratio: '1/1' },
  dental: { src: '', alt: 'Crystal tooth on a pedestal with a soft protective light dome', ratio: '1/1' },
  vision: { src: '', alt: 'Glass eye lens focusing a beam of light into sharp focus on a point', ratio: '1/1' },
};
