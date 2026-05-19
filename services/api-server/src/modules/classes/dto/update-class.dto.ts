import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  grade!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name!: string;
}
