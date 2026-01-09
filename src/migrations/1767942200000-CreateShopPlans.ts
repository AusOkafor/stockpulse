import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateShopPlans1767942200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'shop_plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'shop_id',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'plan',
            type: 'varchar',
            length: '10',
            default: "'FREE'",
          },
          {
            name: 'monthly_notify_limit',
            type: 'int',
            default: 50,
          },
          {
            name: 'notifications_used_this_month',
            type: 'int',
            default: 0,
          },
          {
            name: 'usage_reset_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'shop_plans',
      new TableIndex({
        name: 'IDX_shop_plans_shop_id',
        columnNames: ['shop_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('shop_plans', 'IDX_shop_plans_shop_id');
    await queryRunner.dropTable('shop_plans');
  }
}

