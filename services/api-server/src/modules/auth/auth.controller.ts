import { Body, Controller, Get, Put, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto.js';
import { AuthService } from './auth.service.js';
import { AuthUserView } from './models/auth.models.js';
import { AuthenticatedRequest, readAuthToken } from '../../common/auth/auth-request.js';

interface CookieResponse {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string): void;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: CookieResponse
  ): Promise<{ user: AuthUserView }> {
    const result = await this.authService.register(dto);
    setAuthCookie(response, result.token);
    return { user: result.user };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: CookieResponse
  ): Promise<{ user: AuthUserView }> {
    const result = await this.authService.login(dto);
    setAuthCookie(response, result.token);
    return { user: result.user };
  }

  @Get('me')
  async me(@Req() request: AuthenticatedRequest): Promise<{ user: AuthUserView }> {
    const token = readAuthToken(request);
    if (!token) throw new UnauthorizedException('请先登录');
    return { user: await this.authService.me(token) };
  }

  @Put('me')
  async updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto
  ): Promise<{ user: AuthUserView }> {
    const token = readAuthToken(request);
    if (!token) throw new UnauthorizedException('请先登录');
    return { user: await this.authService.updateProfile(token, dto) };
  }

  @Put('password')
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto
  ): Promise<{ ok: true }> {
    const token = readAuthToken(request);
    if (!token) throw new UnauthorizedException('请先登录');
    return this.authService.changePassword(token, dto);
  }

  @Post('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: CookieResponse
  ): Promise<{ ok: true }> {
    const token = readAuthToken(request);
    if (token) await this.authService.logout(token);
    response.clearCookie('zhida_token');
    return { ok: true };
  }
}

function setAuthCookie(response: CookieResponse, token: string): void {
  response.cookie('zhida_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 24 * 60 * 60 * 1000
  });
}
