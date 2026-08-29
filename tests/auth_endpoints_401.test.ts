import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Auth Endpoints Security Suite - Supertest 401 Assertions (F-02, F-05)', () => {
  const protectedEndpoints: Array<{
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    description: string;
    body?: any;
  }> = [
    {
      method: 'get',
      path: '/api/db/full',
      description: 'Full database export endpoint (F-02)'
    },
    {
      method: 'post',
      path: '/api/db/reset',
      description: 'Database destructive reset endpoint (F-01)',
      body: { confirmationPhrase: 'RESET DATABASE CONFIRM' }
    },
    {
      method: 'get',
      path: '/api/db/backups',
      description: 'List database snapshots/backups endpoint (F-04)'
    },
    {
      method: 'get',
      path: '/api/db/backups/snap_test_123',
      description: 'Get single snapshot detail endpoint (F-04)'
    },
    {
      method: 'post',
      path: '/api/db/backups',
      description: 'Upload snapshot/backup endpoint (F-04, F-05)',
      body: { snapshot: { id: 'snap_test_123' } }
    },
    {
      method: 'delete',
      path: '/api/db/backups/snap_test_123',
      description: 'Delete snapshot endpoint (F-04, F-05)'
    },
    {
      method: 'post',
      path: '/api/auth/refresh',
      description: 'Session refresh endpoint (F-05)'
    },
    {
      method: 'post',
      path: '/api/db/sync-batch',
      description: 'Offline outbox batch sync endpoint',
      body: { mutations: [{ id: 'mut_1', type: 'sale' }] }
    }
  ];

  protectedEndpoints.forEach(({ method, path, description, body }) => {
    it(`rejects unauthenticated ${method.toUpperCase()} ${path} with 401 Unauthorized [${description}]`, async () => {
      let req = request(app)[method](path);
      if (body) {
        req = req.send(body);
      }
      const response = await req;
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it(`rejects invalid token on ${method.toUpperCase()} ${path} with 401 Unauthorized`, async () => {
      let req = request(app)[method](path).set('Authorization', 'Bearer invalid_bogus_token.12345');
      if (body) {
        req = req.send(body);
      }
      const response = await req;
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
