import { Member, PermissionRole } from '../../types/member';

type RawMember = Member & { Id?: string; PermissionRole?: PermissionRole | number | string };

/** Map API member DTO to a consistent shape (`id`, `permissionRole` when sent as PascalCase). */
export function normalizeMemberFromApi(m: Member): Member {
  const raw = m as RawMember;
  let next: Member = { ...m };
  const id = m.id ?? raw.Id;
  if (id != null && String(id).trim() !== '') {
    const sid = String(id).trim();
    if (sid !== m.id) {
      next = { ...next, id: sid };
    }
  }
  const pr = m.permissionRole ?? raw.PermissionRole;
  if (pr !== undefined && pr !== m.permissionRole) {
    next = { ...next, permissionRole: pr as PermissionRole };
  }
  return next;
}
