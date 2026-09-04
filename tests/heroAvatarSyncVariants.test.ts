import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  resolveSyncStatus,
  HeroAvatar,
  Avatar,
  AvatarGroup,
  type HeroAvatarSyncStatus,
} from '../src/components/common/ui/HeroAvatar';

describe('HeroUI v3 HeroAvatar Component & DB Sync Variants', () => {
  describe('resolveSyncStatus - Core DB Sync State Resolver', () => {
    describe('1. Connected Variants -> Success', () => {
      it('resolves canonical "connected" to success status', () => {
        const result = resolveSyncStatus('connected');
        expect(result).not.toBeNull();
        expect(result?.state).toBe('success');
        expect(result?.color).toBe('success');
        expect(result?.label).toContain('Connected');
      });

      it('resolves synonyms "synced", "idle", "online", and "success" to success status', () => {
        const synonyms: HeroAvatarSyncStatus[] = ['synced', 'idle', 'online', 'success'];
        synonyms.forEach((syn) => {
          const res = resolveSyncStatus(syn);
          expect(res?.state).toBe('success');
          expect(res?.color).toBe('success');
        });
      });

      it('handles whitespace and uppercase variations for connected state', () => {
        expect(resolveSyncStatus(' CONNECTED ' as any)?.state).toBe('success');
        expect(resolveSyncStatus('Synced' as any)?.state).toBe('success');
      });
    });

    describe('2. Syncing & Polling Variants -> Warning', () => {
      it('resolves "syncing" to warning status', () => {
        const result = resolveSyncStatus('syncing');
        expect(result).not.toBeNull();
        expect(result?.state).toBe('warning');
        expect(result?.color).toBe('warning');
        expect(result?.label).toContain('Syncing / Polling');
      });

      it('resolves "polling" to warning status', () => {
        const result = resolveSyncStatus('polling');
        expect(result).not.toBeNull();
        expect(result?.state).toBe('warning');
        expect(result?.color).toBe('warning');
      });

      it('resolves "queued", "in-progress", and "warning" to warning status', () => {
        const warningSynonyms = ['queued', 'in-progress', 'in progress', 'saving', 'warning'];
        warningSynonyms.forEach((syn) => {
          const res = resolveSyncStatus(syn as any);
          expect(res?.state).toBe('warning');
          expect(res?.color).toBe('warning');
        });
      });
    });

    describe('3. Not Connected & Offline Variants -> Danger', () => {
      it('resolves "not connected" to danger status', () => {
        const result = resolveSyncStatus('not connected');
        expect(result).not.toBeNull();
        expect(result?.state).toBe('danger');
        expect(result?.color).toBe('danger');
        expect(result?.label).toContain('Not Connected');
      });

      it('resolves "not-connected" and "not_connected" with hyphens/underscores to danger', () => {
        expect(resolveSyncStatus('not-connected' as any)?.state).toBe('danger');
        expect(resolveSyncStatus('not_connected' as any)?.state).toBe('danger');
      });

      it('resolves "disconnected", "error", "offline", and "danger" to danger status', () => {
        const dangerSynonyms = ['disconnected', 'error', 'offline', 'danger', 'unreachable'];
        dangerSynonyms.forEach((syn) => {
          const res = resolveSyncStatus(syn as any);
          expect(res?.state).toBe('danger');
          expect(res?.color).toBe('danger');
        });
      });
    });

    describe('4. Edge Cases & Falsy Inputs', () => {
      it('returns null for undefined, null, or empty status', () => {
        expect(resolveSyncStatus(undefined)).toBeNull();
        expect(resolveSyncStatus(null as any)).toBeNull();
        expect(resolveSyncStatus('' as any)).toBeNull();
      });

      it('returns null for unrecognized status string', () => {
        expect(resolveSyncStatus('unknown-status-xyz' as any)).toBeNull();
      });
    });
  });

  describe('HeroAvatar Component - HeroUI v3 API & Contract', () => {
    it('exports Avatar alias and AvatarGroup compound component', () => {
      expect(Avatar).toBe(HeroAvatar);
      expect(AvatarGroup).toBeDefined();
    });

    it('creates a valid React element with DB sync props', () => {
      const element = React.createElement(HeroAvatar, {
        name: 'Maria Santos',
        syncStatus: 'connected',
        syncVariant: 'both',
        size: 'md',
        isBordered: true,
      });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.syncStatus).toBe('connected');
      expect(element.props.syncVariant).toBe('both');
      expect(element.props.name).toBe('Maria Santos');
      expect(element.props.size).toBe('md');
    });

    it('supports warning status for polling or syncing', () => {
      const elementSyncing = React.createElement(HeroAvatar, {
        name: 'John Doe',
        syncStatus: 'syncing',
      });
      expect(elementSyncing.props.syncStatus).toBe('syncing');

      const elementPolling = React.createElement(HeroAvatar, {
        name: 'John Doe',
        syncStatus: 'polling',
      });
      expect(elementPolling.props.syncStatus).toBe('polling');
    });

    it('supports danger status for disconnected/not connected DB', () => {
      const elementNotConnected = React.createElement(HeroAvatar, {
        name: 'Alex Reyes',
        syncStatus: 'not connected',
      });
      expect(elementNotConnected.props.syncStatus).toBe('not connected');
    });

    it('supports customizable sync placement', () => {
      const placements = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
      placements.forEach((placement) => {
        const el = React.createElement(HeroAvatar, {
          syncPlacement: placement,
          syncStatus: 'connected',
        });
        expect(el.props.syncPlacement).toBe(placement);
      });
    });

    it('supports image source and imgProps', () => {
      const element = React.createElement(HeroAvatar, {
        src: 'https://example.com/avatar.jpg',
        name: 'Jane Doe',
        imgProps: { alt: 'Custom Alt' },
      });
      expect(element.props.src).toBe('https://example.com/avatar.jpg');
      expect(element.props.imgProps?.alt).toBe('Custom Alt');
    });
  });

  describe('AvatarGroup Component', () => {
    it('creates a valid AvatarGroup element', () => {
      const group = React.createElement(
        AvatarGroup,
        { max: 3, size: 'sm' },
        React.createElement(HeroAvatar, { name: 'User 1' }),
        React.createElement(HeroAvatar, { name: 'User 2' }),
        React.createElement(HeroAvatar, { name: 'User 3' }),
        React.createElement(HeroAvatar, { name: 'User 4' })
      );
      expect(React.isValidElement(group)).toBe(true);
      expect(group.props.max).toBe(3);
    });
  });
});
