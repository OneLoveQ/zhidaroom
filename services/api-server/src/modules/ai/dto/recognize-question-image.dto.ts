import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RecognizeQuestionImageDto {
  @IsString()
  @IsNotEmpty()
  imageDataUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  grade!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  difficulty?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  count?: number;

  @IsString()
  @IsOptional()
  @MaxLength(800)
  instruction?: string;
}
