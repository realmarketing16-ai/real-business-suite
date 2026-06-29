import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';

@Controller('auth')
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register') register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('login') login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Post('forgot-password') forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.auth.forgotPassword(input);
  }

  @Post('reset-password') resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword(input);
  }
}
