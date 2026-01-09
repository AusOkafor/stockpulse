import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateShopSettings1767942100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'shop_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'shop_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'auto_notify_on_restock',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'shop_settings',
      new TableIndex({
        name: 'IDX_shop_settings_shop_id',
        columnNames: ['shop_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'shop_settings',
      new TableForeignKey({
        columnNames: ['shop_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'shops',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('shop_settings');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('shop_id') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('shop_settings', foreignKey);
      }
    }
    await queryRunner.dropIndex('shop_settings', 'IDX_shop_settings_shop_id');
    await queryRunner.dropTable('shop_settings');
  }
}

