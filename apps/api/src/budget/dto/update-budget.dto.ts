import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UpdateBudgetDto {
  @ApiProperty({
    description: 'Updated monthly budget target amount',
    example: 600.0,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;
}
