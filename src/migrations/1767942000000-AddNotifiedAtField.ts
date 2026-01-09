import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNotifiedAtField1767942000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'demand_requests',
      new TableColumn({
        name: 'notified_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('demand_requests', 'notified_at');
  }
}

