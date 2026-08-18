import { describe, expect, it } from 'vitest';
import { hasPermission } from './index.js';

describe('permission resolver', () => {
  it('never lets guests ban users', () => expect(hasPermission('guest', 'user.ban')).toBe(false));
  it('allows owners to manage channels', () => expect(hasPermission('owner', 'channel.create')).toBe(true));
  it('lets members join and speak', () => {
    expect(hasPermission('member', 'channel.join')).toBe(true);
    expect(hasPermission('member', 'voice.speak')).toBe(true);
  });
});
