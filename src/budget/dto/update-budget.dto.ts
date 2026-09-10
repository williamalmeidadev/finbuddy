import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UpdateBudgetDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;
}
