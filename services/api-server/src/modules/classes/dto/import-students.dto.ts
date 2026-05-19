import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested
} from 'class-validator';

export class ImportStudentItemDto {
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
}

export class ImportStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ImportStudentItemDto)
  students!: ImportStudentItemDto[];
}

