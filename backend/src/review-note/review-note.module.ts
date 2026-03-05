import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewNote } from './review-note.entity';
import { ReviewNoteService } from './review-note.service';
import { ReviewNoteController } from './review-note.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewNote])],
  providers: [ReviewNoteService],
  controllers: [ReviewNoteController],
  exports: [ReviewNoteService],
})
export class ReviewNoteModule {}
