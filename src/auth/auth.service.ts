import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { UserRepository } from '../user/user.repository';
import { PasswordService } from '../password/password.service';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordService: PasswordService,
        private readonly jwtService: JwtService,
    ) { }

    async login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();

        const user = await this.userRepository.findByEmail(normalizedEmail);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await this.passwordService.verify(
            user.passwordHash,
            password,
        );


        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
        });

        return {
            accessToken,
            user: new UserResponseDto(user),
        };
    }
}