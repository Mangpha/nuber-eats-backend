import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantRepository } from 'src/restaurants/repositories/restaurant.repository';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentResolver } from './payments.resolver';
import { PaymentService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  imports: [TypeOrmModule.forFeature([Payment, RestaurantRepository])],
  providers: [PaymentService, PaymentResolver],
})
export class PaymentsModule {}
