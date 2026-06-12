import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { JwtAuthGuard, type JwtPayload } from '@nih/auth';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@nih/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { OAuthProfile } from './strategies/github.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Get('confirm/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirm(@Param('token') token: string) {
    await this.auth.confirmEmail(token);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.refresh(req, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() req: Request & { user: JwtPayload }) {
    return this.auth.getProfile(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateMe(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(req.user.sub, dto);
  }

  // ── GitHub OAuth ────────────────────────────────────────────────────────────

  @Get('github')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('github'))
  githubLogin(): void { /* passport redirects */ }

  @Get('github/callback')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: Request & { user: OAuthProfile },
    @Res() res: Response,
  ): Promise<void> {
    await this.auth.oauthLogin(req.user, res);
    res.redirect(this.config.get('FRONTEND_URL', { infer: true }));
  }

  // ── Google OAuth ────────────────────────────────────────────────────────────

  @Get('google')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('google'))
  googleLogin(): void { /* passport redirects */ }

  @Get('google/callback')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: OAuthProfile },
    @Res() res: Response,
  ): Promise<void> {
    await this.auth.oauthLogin(req.user, res);
    res.redirect(this.config.get('FRONTEND_URL', { infer: true }));
  }
}
