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
  hero: { src: '/assets/buyers-guide/01-hero.webp', alt: 'Glass compass resting on insurance documents under a navy studio spotlight', ratio: '16/9' },
  'lesson-ceiling': { src: '/assets/buyers-guide/02-ceiling.webp', alt: 'Two glass pillars of different heights representing premium versus out-of-pocket ceiling', ratio: '1/1' },
  'lesson-network': { src: '/assets/buyers-guide/03-network.webp', alt: 'Glowing map of connected clinic nodes with one node outside the boundary', ratio: '1/1' },
  'lesson-toolbox': { src: '/assets/buyers-guide/04-toolbox.webp', alt: 'Open glass toolbox with six distinct glowing instruments, one per coverage line', ratio: '1/1' },
  'lesson-timing': { src: '/assets/buyers-guide/05-timing.webp', alt: 'Glass hourglass beside a calendar etched in light showing enrollment windows', ratio: '1/1' },
  'lesson-conversation': { src: '/assets/buyers-guide/06-conversation.webp', alt: 'Two glass chairs facing each other under a warm spotlight, no desk between them', ratio: '1/1' },
  health: { src: '/assets/buyers-guide/07-health.webp', alt: 'Crystal shield with a plus sign over a family silhouette in navy studio light', ratio: '1/1' },
  life: { src: '/assets/buyers-guide/08-life.webp', alt: 'Glass tree with golden roots sheltering small house and family figures', ratio: '1/1' },
  gap: { src: '/assets/buyers-guide/09-gap.webp', alt: 'Glass bridge closing the gap between two cliff edges lit in cyan', ratio: '1/1' },
  medicare: { src: '/assets/buyers-guide/10-medicare.webp', alt: 'Four interlocking glass segments forming a circle, one segment gold', ratio: '1/1' },
  dental: { src: '/assets/buyers-guide/11-dental.webp', alt: 'Crystal tooth on a pedestal with a soft protective light dome', ratio: '1/1' },
  vision: { src: '/assets/buyers-guide/12-vision.webp', alt: 'Glass eye lens focusing a beam of light into sharp focus on a point', ratio: '1/1' },
};
