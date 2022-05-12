import { ArgsType, OmitType } from '@nestjs/graphql';
import { Restaurant } from '../entities/restaurant.entity';

@ArgsType()
export class CreateRestaurantDto extends OmitType(
  Restaurant,
  ['id'],
  ArgsType,
) {}
