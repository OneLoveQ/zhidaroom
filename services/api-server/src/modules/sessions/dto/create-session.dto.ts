import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  title!: string;

  @IsString()
  @IsIn(['exit_ticket', 'quiz', 'vote'])
  mode!: 'exit_ticket' | 'quiz' | 'vote';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  questionIds!: string[];

  @IsString()
  @IsOptional()
  @MaxLength(30)
  teacherName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  subject?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  classroomCode?: string;
}
