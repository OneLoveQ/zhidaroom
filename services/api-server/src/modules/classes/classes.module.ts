import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
import { SqliteClassesRepository } from './repositories/sqlite-classes.repository.js';

@Module({
  controllers: [ClassesController],
  providers: [
    ClassesService,
    {
      provide: 'ClassesRepository',
      useClass: SqliteClassesRepository
    }
  ],
  exports: [ClassesService]
})
export class ClassesModule {}
