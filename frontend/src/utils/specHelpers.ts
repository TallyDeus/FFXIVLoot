import { Member, SpecType } from '../types/member';

/**
 * Helper functions for working with spec types
 * Eliminates code duplication across components
 */

/**
 * Gets the appropriate BiS items list for a spec type
 */
export function getBisItems(member: Member, specType: 'main' | 'off'): typeof member.bisItems {
  return specType === 'off' ? member.offSpecBisItems : member.bisItems;
}

/**
 * Gets the appropriate xivgear link for a spec type
 */
export function getXivGearLink(member: Member, specType: 'main' | 'off'): string | undefined {
  return specType === 'off' ? member.offSpecXivGearLink : member.xivGearLink;
}

/**
 * Converts frontend spec type to backend spec type
 */
export function toBackendSpecType(specType: 'main' | 'off'): SpecType {
  return specType === 'off' ? SpecType.OffSpec : SpecType.MainSpec;
}

/**
 * Converts backend spec type to frontend spec type
 */
export function toFrontendSpecType(specType: SpecType): 'main' | 'off' {
  return specType === SpecType.OffSpec ? 'off' : 'main';
}

