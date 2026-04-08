/**
 * RaidPlan.io uses the URL fragment for in-slide navigation: the first slide is the plain plan URL;
 * each further slide appends `#2`, `#3`, etc. (`slideIndex` is 0-based; slide 0 has no fragment).
 */
export function raidPlanUrlForSlide(baseUrl: string, slideIndex: number): string {
  const trimmed = baseUrl.trim();
  const noHash = trimmed.includes('#') ? trimmed.slice(0, trimmed.indexOf('#')) : trimmed;
  if (slideIndex <= 0) return noHash;
  return `${noHash}#${slideIndex + 1}`;
}
