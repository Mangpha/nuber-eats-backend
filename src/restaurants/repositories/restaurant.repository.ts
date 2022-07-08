import { CoreOutput } from 'src/common/dtos/output.dto';
import { EntityRepository, Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';

@EntityRepository(Restaurant)
export class RestaurantRepository extends Repository<Restaurant> {
  async checkOwner(ownerId: number, restaurantId: number): Promise<CoreOutput> {
    const restaurant = await this.findOne({
      id: restaurantId,
    });
    if (!restaurant) return { ok: false, error: 'Restaurant not found' };
    if (ownerId !== restaurant.ownerId)
      return {
        ok: false,
        error: 'You do not own',
      };
    return { ok: true };
  }

  // async findAndPagination()
  // async findCountAndPagination()
}
