import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard, AdminGuard } from './auth';
import { config } from './config';
test('live auth rejects missing/invalid tokens and ignores browser admin claims', async () => {
  config.demo = false;
  const original = process.env.ADMIN_USER_IDS;
  process.env.ADMIN_USER_IDS = 'real-admin';
  const req: any = {
    headers: { 'x-demo-user': 'real-admin' },
    body: { admin: true },
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
  const guard = new AuthGuard();
  (guard as any).auth = {
    auth: {
      getUser: async (token: string) =>
        token === 'valid'
          ? {
              data: {
                user: { id: 'traveller', user_metadata: { admin: true } },
              },
              error: null,
            }
          : { data: { user: null }, error: new Error('invalid') },
    },
  };
  try {
    await assert.rejects(guard.canActivate(ctx));
    req.headers.authorization = 'Bearer invalid';
    await assert.rejects(guard.canActivate(ctx));
    req.headers.authorization = 'Bearer valid';
    await guard.canActivate(ctx);
    assert.equal(req.user.admin, false);
    assert.throws(() => new AdminGuard().canActivate(ctx));
    process.env.ADMIN_USER_IDS = 'traveller';
    await guard.canActivate(ctx);
    assert.equal(new AdminGuard().canActivate(ctx), true);
  } finally {
    config.demo = true;
    if (original === undefined) delete process.env.ADMIN_USER_IDS;
    else process.env.ADMIN_USER_IDS = original;
  }
});
