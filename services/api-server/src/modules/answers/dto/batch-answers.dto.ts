import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

class AnswerItemDto {
  @IsString()
  @IsNotEmpty()
  cardCode!: string;

  @IsString()
  @IsIn(['A', 'B', 'C', 'D'])
  selectedOption!: 'A' | 'B' | 'C' | 'D';

  @IsNumber()
  @Min(0)
  @Max(1)
  recognitionScore!: number;

  @IsISO8601()
  recognizedAt!: string;
}

export class BatchAnswersDto {
  @IsUUID()
  @IsOptional()
  runId?: string;

  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers!: AnswerItemDto[];
}
