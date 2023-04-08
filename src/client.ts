require('dotenv').config();
import amqplib from 'amqplib';
import winston from 'winston';
import { EXCHANGE, NEW_TXN_QUEUE, NEW_TXN_ROUTE, UPDATE_TXN_QUEUE, UPDATE_TXN_ROUTE } from './constants';

const logger = winston.createLogger({
	transports: [new winston.transports.Console()]
});

const amqp_url = process.env.AMQP_URL || 'amqp://localhost:5672';

async function produce() {
	const conn = await amqplib.connect(amqp_url, 'heartbeat=60');
	const ch = await conn.createChannel();

	await ch.assertExchange(EXCHANGE, 'direct', { durable: true }).catch((e) => {
		logger.error(e);
	});
	await ch.assertQueue(UPDATE_TXN_QUEUE, { durable: true });
	await ch.bindQueue(UPDATE_TXN_QUEUE, EXCHANGE, UPDATE_TXN_ROUTE);

	await ch.assertQueue(NEW_TXN_QUEUE, { durable: true });
	await ch.bindQueue(NEW_TXN_QUEUE, EXCHANGE, NEW_TXN_ROUTE);

	logger.info(`Publishing a update transaction to the UpdateTransactions queue`);
	ch.publish(
		EXCHANGE,
		UPDATE_TXN_ROUTE,
		Buffer.from(
			JSON.stringify({
				clientId: '12345',
				walletAddress: '0x123456789abcdefg',
				currencyType: 'ethereum'
			})
		)
	);

	await ch.consume(NEW_TXN_QUEUE, (msg: any) => {
		logger.info(`Reading message from NewTransactions command: ${msg.content.toString()}`);
		const data = JSON.parse(msg.content.toString());
		logger.info(data);
		ch.ack(msg);
	});
}

produce();
