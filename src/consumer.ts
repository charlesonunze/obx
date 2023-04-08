import amqplib from 'amqplib';
import { logger } from '.';
import { EXCHANGE, NEW_TXN_QUEUE, NEW_TXN_ROUTE, UPDATE_TXN_QUEUE } from './constants';
import { AppDataSource, UserTransactionRepo } from './datasource';

const amqp_url = process.env.AMQP_URL || 'amqp://localhost:5672';

export const consumer = async () => {
	const conn = await amqplib.connect(amqp_url, 'heartbeat=60');
	const ch = await conn.createChannel();

	await ch.assertExchange(EXCHANGE, 'direct', { durable: true }).catch((e) => {
		logger.error(e);
	});
	await ch.assertQueue(UPDATE_TXN_QUEUE, { durable: true });
	await ch.assertQueue(NEW_TXN_QUEUE, { durable: true });

	await ch.consume(UPDATE_TXN_QUEUE, async (msg: any) => {
		logger.info(`Reading message from UpdateTransactions command: ${msg.content.toString()}`);

		const data = JSON.parse(msg.content.toString());
		const transactions = await getListOfTransactions(data.walletAddress);
		const newTransactions = [];

		for (const transaction of transactions) {
			// check if txn is already stored
			const record = await UserTransactionRepo.findOne({
				where: { transaction_hash: transaction.transaction_hash }
			});
			if (!record) newTransactions.push(transaction);
		}

		let processingErr;

		newTransactions.forEach(async (tx) => {
			let userTransaction = UserTransactionRepo.create(tx);
			userTransaction.user_id = data.clientId;
			userTransaction.address = data.walletAddress;
			userTransaction.currency_type = data.currencyType;

			const queryRunner = AppDataSource.createQueryRunner();
			await queryRunner.startTransaction();

			let err;

			try {
				await queryRunner.manager.save(userTransaction);
				await queryRunner.commitTransaction();
			} catch (err) {
				processingErr = err;
				err = err;
				await queryRunner.rollbackTransaction();
			} finally {
				await queryRunner.release();
			}

			if (!err) {
				const newMsg = JSON.stringify(tx);
				logger.info(`Publishing a new transaction to the NewTransactions queue: ${newMsg}`);
				ch.publish(EXCHANGE, NEW_TXN_ROUTE, Buffer.from(newMsg));
			}
		});

		if (!processingErr) {
			ch.ack(msg);
		}
	});
};

async function getListOfTransactions(walletAddress: string) {
	logger.info(`Fetching list of transactions for ${walletAddress}`);

	return Promise.resolve([
		{
			transaction_hash: '0xf83b2fb09755d0f753f3de3e5f570c3ccdcdb95ff4c5c7cf091df4f277c32e23',
			to: '0x1358726ef028313b1D3f3143F120299709912Be1',
			from: '0x1358726ef028313b1D3f3143F120299709912Be1',
			amount: '0.119',
			date: '2023-04-07T02:47:23.245Z'
		}
	]);
}
