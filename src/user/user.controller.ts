import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
}

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.userService.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      userId: user.userId,
    };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    const user = await this.userService.createUser(registerDto.email, registerDto.password);
    
    return {
      id: user.id,
      email: user.email,
      userId: user.userId,
    };
  }
} 