import { Body, Controller, Get, Post, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
    if (!username || !password) {
      return { success: false, message: '请输入用户名和密码' };
    }
    return this.authService.login(username, password);
  }

  @Get('me')
  async me(@Request() req: any) {
    const user = await this.authService.validateUser(req.user.userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在或已禁用');
    }
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role,
    };
  }
}
