import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class QuestionOptionsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  A!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  B!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  C!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  D!: string;
}

export class CreateQuestionDto {
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
  @MaxLength(1000)
  stem!: string;

  @ValidateNested()
  @Type(() => QuestionOptionsDto)
  options!: QuestionOptionsDto;

  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  answer!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  explanation!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  knowledgePoints!: string[];

  @IsString()
  @IsIn(['基础', '巩固', '提升'])
  difficulty!: string;
}

