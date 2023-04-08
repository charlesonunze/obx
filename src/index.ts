require('dotenv').config();
import 'reflect-metadata';
import winston from 'winston';

import { consumer } from './consumer';
import { AppDataSource, UserTransactionRepo } from './datasource';
const app = require('express')();

export const logger = winston.createLogger({
	transports: [new winston.transports.Console()]
});

async function init() {
	try {
		await AppDataSource.initialize();
		logger.info('Database started!');

		await consumer();
		logger.info('Consumer started!');

		app.listen(3000);
		logger.info('Server started!');
	} catch (error) {
		logger.error('Stopped', error);
	}
}

init();

app.get('/transactions', async (req: any, res: any) => {
	const { clientId, walletAddress, currencyType } = req.query;

	const queryBuilder = UserTransactionRepo.createQueryBuilder('s');

	if (clientId)
		queryBuilder.andWhere('s.user_id = :clientId', {
			clientId
		});

	if (walletAddress) {
		queryBuilder.andWhere('s.address = :walletAddress', {
			walletAddress
		});
	}

	if (currencyType) {
		queryBuilder.andWhere('s.currency_type = :currencyType', {
			currencyType
		});
	}

	const transactions = await queryBuilder.take(10).skip(0).getMany();

	res.json(transactions);
});
