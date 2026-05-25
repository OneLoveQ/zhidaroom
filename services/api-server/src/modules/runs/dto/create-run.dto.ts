import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRunDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  title!: string;

  @IsString()
  @IsIn(['exit_ticket', 'quiz', 'vote'])
  type!: 'exit_ticket' | 'quiz' | 'vote';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  questionIds!: string[];
}
