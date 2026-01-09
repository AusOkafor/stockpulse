import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateShopsForOAuth1767942300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before adding
    const shopTable = await queryRunner.getTable('shops');
    
    // Add is_active column if it doesn't exist
    if (!shopTable?.findColumnByName('is_active')) {
      await queryRunner.addColumn(
        'shops',
        new TableColumn({
          name: 'is_active',
          type: 'boolean',
          default: true,
          isNullable: true,
        }),
      );
    }

    // Add installed_at column if it doesn't exist
    // Use created_at as initial value for existing records
    if (!shopTable?.findColumnByName('installed_at')) {
      await queryRunner.addColumn(
        'shops',
        new TableColumn({
          name: 'installed_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
      
      // Copy created_at to installed_at for existing records
      await queryRunner.query(`
        UPDATE shops 
        SET installed_at = created_at 
        WHERE installed_at IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const shopTable = await queryRunner.getTable('shops');
    
    // Remove is_active column if it exists
    if (shopTable?.findColumnByName('is_active')) {
      await queryRunner.dropColumn('shops', 'is_active');
    }

    // Remove installed_at column if it exists
    if (shopTable?.findColumnByName('installed_at')) {
      await queryRunner.dropColumn('shops', 'installed_at');
    }
  }
}

