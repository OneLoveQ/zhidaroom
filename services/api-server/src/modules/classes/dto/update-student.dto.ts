import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  studentNo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^C\d{3}$/)
  cardCode!: string;

  @IsString()
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}
