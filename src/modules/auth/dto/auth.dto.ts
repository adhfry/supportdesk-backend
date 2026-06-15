import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ahda Firly Barori' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'ahda@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsNotEmpty()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ahda@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsNotEmpty()
  password!: string;
}
