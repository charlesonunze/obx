import { DataSource } from 'typeorm';
import { UserTransaction } from './entities';

console.log('here', process.env.DATABASE_URL);
console.log('here', process.env.AMQP_URL);
export const AppDataSource = new DataSource({
	type: 'postgres',
	url: process.env.DATABASE_URL,
	logging: false,
	synchronize: true,
	entities: [UserTransaction]
});

export const UserTransactionRepo = AppDataSource.getRepository(UserTransaction);
