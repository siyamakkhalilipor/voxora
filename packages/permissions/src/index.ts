import type { Permission, Role } from '@voxora/protocol';

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set([
    'server.manage','channel.create','channel.edit','channel.delete','channel.join','channel.move_user',
    'user.kick','user.ban','role.assign','message.send','voice.speak'
  ]),
  admin: new Set([
    'server.manage','channel.create','channel.edit','channel.delete','channel.join','channel.move_user',
    'user.kick','user.ban','role.assign','message.send','voice.speak'
  ]),
  moderator: new Set(['channel.join','channel.move_user','user.kick','message.send','voice.speak']),
  member: new Set(['channel.join','message.send','voice.speak']),
  guest: new Set(['channel.join','message.send','voice.speak'])
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const error = new Error(`Permission denied: ${permission}`);
    error.name = 'PermissionDeniedError';
    throw error;
  }
}

export function permissionsForRole(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
