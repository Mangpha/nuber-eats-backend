import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteAccountOutput } from 'src/users/dtos/delete-account.dto';
import { User } from 'src/users/entities/user.entity';
import { Like, Raw, Repository } from 'typeorm';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { DeleteDishInput, DeleteDishOutput } from './dtos/delete-dish.dto';
import { DeleteRestaurantInput } from './dtos/delete-restaurant.dto';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { Category } from './entities/category.entity';
import { Dish } from './entities/dish.entity';
import { CategoryRepository } from './repositories/category.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly categories: CategoryRepository,
    @InjectRepository(Dish) private readonly dishes: Repository<Dish>,
  ) {}

  // Restaurant Service

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName,
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: 'Could not create restaurant',
      };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const check = await this.restaurants.checkOwner(
        owner.id,
        editRestaurantInput.restaurantId,
      );
      if (!check.ok) return check;
      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
      }
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          ...(category && { category }),
        },
      ]);
      return {
        ok: true,
      };
    } catch (e) {
      return { ok: false, error: 'Could not edit Restaurant' };
    }
  }

  async deleteRestaurant(
    owner: User,
    { id }: DeleteRestaurantInput,
  ): Promise<DeleteAccountOutput> {
    try {
      const check = await this.restaurants.checkOwner(owner.id, id);
      if (!check.ok) return check;
      await this.restaurants.delete(id);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Could not delete restaurant' };
    }
  }

  // Category Service

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return { ok: true, categories };
    } catch {
      return {
        ok: false,
        error: 'Could not load categories',
      };
    }
  }

  async countRestaurants(category: Category): Promise<number> {
    return await this.restaurants.count({ category });
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({ slug });
      if (!category) return { ok: false, error: 'Category not found' };
      const restaurant = await this.restaurants.find({
        where: {
          category,
        },
        order: {
          isPromoted: 'DESC',
        },
        take: 25,
        skip: (page - 1) * 25,
      });
      category.restaurants = restaurant;
      const totalResults = await this.countRestaurants(category);
      return { ok: true, category, totalPages: Math.ceil(totalResults / 25) };
    } catch {
      return { ok: false, error: 'Could not load category' };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        skip: (page - 1) * 25,
        take: 25,
        order: {
          isPromoted: 'DESC',
        },
      });
      return {
        ok: true,
        results: restaurants,
        totalPages: Math.ceil(totalResults / 25),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load restaurants',
      };
    }
  }

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(
        {
          id: restaurantId,
        },
        { relations: ['menu'] },
      );
      if (!restaurant) return { ok: false, error: 'Restaurant not found' };
      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not find restaurant',
      };
    }
  }

  async searchRestaurantByName({
    query,
    page,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: {
          name: Raw((name) => `${name} ILIKE '%${query}%'`),
        },
        skip: (page - 1) * 25,
        take: 25,
      });
      return {
        ok: true,
        restaurants,
        totalPages: Math.ceil(totalResults / 25),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not search for restaurants',
      };
    }
  }

  // Dish Service

  async createDish(
    owner: User,
    createDishInput: CreateDishInput,
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findOne(
        createDishInput.restaurantId,
      );
      if (!restaurant) return { ok: false, error: 'Restaurant not found' };
      if (owner.id !== restaurant.ownerId)
        return { ok: false, error: 'Restaurant is not yours' };
      await this.dishes.save(
        this.dishes.create({ ...createDishInput, restaurant }),
      );

      return { ok: true };
    } catch (error) {
      console.log(error);
      return { ok: false, error: 'Could not create Dish' };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne(editDishInput.dishId, {
        relations: ['restaurant'],
      });
      if (!dish) return { ok: false, error: 'Dish not found' };
      if (dish.restaurant.ownerId !== owner.id)
        return { ok: false, error: 'Restaurant is not yours' };
      await this.dishes.save([
        {
          id: editDishInput.dishId,
          ...editDishInput,
        },
      ]);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not edit dish' };
    }
  }

  async deleteDish(
    owner: User,
    { dishId }: DeleteDishInput,
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findOne(dishId, {
        relations: ['restaurant'],
      });
      if (!dish) return { ok: false, error: 'Dish not found' };
      if (dish.restaurant.ownerId !== owner.id)
        return { ok: false, error: 'Restaurant is not yours' };
      await this.dishes.delete(dishId);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not delete dish' };
    }
  }
}
