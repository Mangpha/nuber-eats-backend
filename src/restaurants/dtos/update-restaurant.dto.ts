import { Args, ArgsType, Field, InputType, PartialType } from '@nestjs/graphql';
import { Restaurant } from '../entities/restaurant.entity';
import { CreateRestaurantDto } from './create-restaurant.dto';

@ArgsType()
export class UpdateRestaurantDto extends PartialType(Restaurant, ArgsType) {
  @Field((type) => Number)
  id: number;
}
