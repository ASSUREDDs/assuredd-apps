import type { LoginResponse, RefreshResponse, RegisterResponse } from '@app/contracts';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { LoginUseCase } from '@application/auth/login.usecase';
import { LogoutUseCase } from '@application/auth/logout.usecase';
import { RefreshUseCase } from '@application/auth/refresh.usecase';
import { RegisterUseCase } from '@application/auth/register.usecase';

import { DomainErrorHttpMapper } from '../shared/domain-error-http.mapper';
import { toAuthResponse } from './auth-response.mapper';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly registerUseCase: RegisterUseCase,
        private readonly loginUseCase: LoginUseCase,
        private readonly refreshUseCase: RefreshUseCase,
        private readonly logoutUseCase: LogoutUseCase,
        private readonly errors: DomainErrorHttpMapper,
    ) {}

    @Post('register')
    async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
        const result = await this.registerUseCase.execute(dto);
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toAuthResponse(result.value);
    }

    @Post('login')
    async login(@Body() dto: LoginDto): Promise<LoginResponse> {
        const result = await this.loginUseCase.execute(dto);
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return toAuthResponse(result.value);
    }

    @Post('refresh')
    async refresh(@Body() dto: RefreshDto): Promise<RefreshResponse> {
        const result = await this.refreshUseCase.execute(dto.refreshToken);
        if (!result.ok) throw this.errors.toHttpException(result.error);

        return result.value;
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async logout(@Body() dto: LogoutDto): Promise<void> {
        await this.logoutUseCase.execute(dto.refreshToken);
    }
}
