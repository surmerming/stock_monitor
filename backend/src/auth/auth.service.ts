import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { LoginAttempt } from './login-attempt.entity';

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: { id: number; username: string; displayName: string; role: string };
  message?: string;
  lockedUntil?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(LoginAttempt) private readonly attemptRepo: Repository<LoginAttempt>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const lockCheck = await this.checkLockout(username);
    if (lockCheck) {
      return lockCheck;
    }

    const user = await this.userRepo.findOneBy({ username });
    if (!user || !user.isActive) {
      await this.recordAttempt(username, false);
      return { success: false, message: '用户名或密码错误' };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.recordAttempt(username, false);
      const remaining = await this.getRemainingInfo(username);
      return { success: false, message: `用户名或密码错误${remaining}` };
    }

    await this.recordAttempt(username, true);

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.userRepo.findOneBy({ id: userId, isActive: true });
  }

  private async recordAttempt(username: string, success: boolean): Promise<void> {
    await this.attemptRepo.save(this.attemptRepo.create({ username, success }));
  }

  private async checkLockout(username: string): Promise<LoginResult | null> {
    const now = new Date();

    // Rule 1: 5 consecutive failures in the last hour -> lock 1 hour from last failure
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentAttempts = await this.attemptRepo.find({
      where: { username, createdAt: MoreThanOrEqual(oneHourAgo) },
      order: { createdAt: 'DESC' },
    });

    let consecutiveFails = 0;
    for (const attempt of recentAttempts) {
      if (attempt.success) break;
      consecutiveFails++;
    }

    if (consecutiveFails >= 5) {
      const lastFail = recentAttempts[0];
      const lockedUntil = new Date(lastFail.createdAt.getTime() + 60 * 60 * 1000);
      if (now < lockedUntil) {
        const mins = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
        return {
          success: false,
          message: `连续登录失败5次，账户已锁定，请${mins}分钟后再试`,
          lockedUntil: lockedUntil.toISOString(),
        };
      }
    }

    // Rule 2: 10 total failures today -> lock 24 hours from last failure
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayFails = await this.attemptRepo.count({
      where: {
        username,
        success: false,
        createdAt: MoreThanOrEqual(todayStart),
      },
    });

    if (todayFails >= 10) {
      const lastDayFail = await this.attemptRepo.findOne({
        where: { username, success: false, createdAt: MoreThanOrEqual(todayStart) },
        order: { createdAt: 'DESC' },
      });
      if (lastDayFail) {
        const lockedUntil = new Date(lastDayFail.createdAt.getTime() + 24 * 60 * 60 * 1000);
        if (now < lockedUntil) {
          const hours = Math.ceil((lockedUntil.getTime() - now.getTime()) / 3600000);
          return {
            success: false,
            message: `当天登录失败已达10次，账户已锁定24小时，请${hours}小时后再试`,
            lockedUntil: lockedUntil.toISOString(),
          };
        }
      }
    }

    return null;
  }

  private async getRemainingInfo(username: string): Promise<string> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentAttempts = await this.attemptRepo.find({
      where: { username, createdAt: MoreThanOrEqual(oneHourAgo) },
      order: { createdAt: 'DESC' },
    });

    let consecutiveFails = 0;
    for (const attempt of recentAttempts) {
      if (attempt.success) break;
      consecutiveFails++;
    }

    if (consecutiveFails >= 3) {
      return `，连续失败${consecutiveFails}次，5次后将锁定1小时`;
    }

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayFails = await this.attemptRepo.count({
      where: { username, success: false, createdAt: MoreThanOrEqual(todayStart) },
    });

    if (todayFails >= 7) {
      return `，今日已失败${todayFails}次，10次后将锁定24小时`;
    }

    return '';
  }
}
