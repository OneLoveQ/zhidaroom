import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';

export class GenerateQuestionsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  grade!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  knowledgePoint!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1200)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(10)
  count!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  difficulty!: string;

  @IsString()
  @IsIn(['single_choice'])
  questionType!: 'single_choice';

  @IsString()
  @IsOptional()
  @MaxLength(30)
  textbookVersion?: string;
}
