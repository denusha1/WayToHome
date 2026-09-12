import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { config } from './config';
export type AuthRequest = Request & { user: { id: string; admin: boolean } };
@Injectable()
export class AuthGuard implements CanActivate {
  private auth =
    !config.demo && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        })
      : null;
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    if (config.demo) {
      const id = req.headers['x-demo-user'];
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id))
        throw new UnauthorizedException('Start a demo session first.');
      req.user = { id, admin: true };
      return true;
    }
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token || !this.auth)
      throw new UnauthorizedException('Please sign in to continue.');
    const { data, error } = await this.auth.auth.getUser(token);
    if (error || !data.user)
      throw new UnauthorizedException('Session expired. Please sign in again.');
    req.user = {
      id: data.user.id,
      admin: (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((x) => x.trim())
        .includes(data.user.id),
    };
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (!ctx.switchToHttp().getRequest<AuthRequest>().user?.admin)
      throw new ForbiddenException('Admin access required.');
    return true;
  }
}
