import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum StatusEnum {
	Pending = 'pending',
	Completed = 'completed',
	Failed = 'failed'
}

@Entity({ name: 'user_transaction' })
export class UserTransaction {
	@PrimaryGeneratedColumn('uuid')
	id?: string;

	@Column()
	user_id?: string;

	@Column()
	address?: string;

	@Column()
	currency_type?: string;

	@Column()
	transaction_hash?: string;

	@Column()
	to?: string;

	@Column()
	from?: string;

	@Column()
	amount?: string;

	@Column()
	date?: Date;

	@Column({ type: 'enum', enum: StatusEnum, default: StatusEnum.Pending })
	status?: StatusEnum;
}
