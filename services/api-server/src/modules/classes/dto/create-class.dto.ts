import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  grade!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name!: string;
}

