import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1767941737576 implements MigrationInterface {
    name = 'InitialMigration1767941737576'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."demand_requests_channel_enum" AS ENUM('EMAIL', 'WHATSAPP')`);
        await queryRunner.query(`CREATE TYPE "public"."demand_requests_status_enum" AS ENUM('PENDING', 'NOTIFIED', 'CONVERTED')`);
        await queryRunner.query(`CREATE TABLE "demand_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "variant_id" uuid NOT NULL, "contact" character varying NOT NULL, "channel" "public"."demand_requests_channel_enum" NOT NULL, "status" "public"."demand_requests_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f74cf5b027c2ef3a14cf50661e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_84121f66b819dbcd1c5a8bcca3" ON "demand_requests" ("variant_id") `);
        await queryRunner.query(`CREATE TABLE "recovery_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "demand_request_id" uuid NOT NULL, "token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_14ac80cf247b584608850551df8" UNIQUE ("token"), CONSTRAINT "PK_272ddd757e19d9f052f8c8f0da7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d9dd89a63fdda18b81749fe8d0" ON "recovery_links" ("demand_request_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_14ac80cf247b584608850551df" ON "recovery_links" ("token") `);
        await queryRunner.query(`CREATE TABLE "order_attributions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" character varying NOT NULL, "shop_id" uuid NOT NULL, "recovery_link_id" uuid, "revenue" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0f50234e320ab7776e674d14a7a" UNIQUE ("order_id"), CONSTRAINT "PK_b5a425d7e293dc57a19ae886762" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c529fc01765c17c379c79749f1" ON "order_attributions" ("shop_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7df7e0ea8a32f90b53e83b7bbe" ON "order_attributions" ("recovery_link_id") `);
        await queryRunner.query(`CREATE TABLE "shops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shopifyDomain" character varying NOT NULL, "access_token" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c954fbd6f494006fa3fd30c48bb" UNIQUE ("shopifyDomain"), CONSTRAINT "PK_3c6aaa6607d287de99815e60b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shop_id" uuid NOT NULL, "shopify_product_id" character varying NOT NULL, "title" character varying NOT NULL, "image_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3f16f24f1b961af087fe188b543" UNIQUE ("shopify_product_id"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9e952e93f369f16e27dd786c33" ON "products" ("shop_id") `);
        await queryRunner.query(`CREATE TABLE "variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "shopify_variant_id" character varying NOT NULL, "inventory_quantity" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_be8d64998f003af34cee2ffa2de" UNIQUE ("shopify_variant_id"), CONSTRAINT "PK_672d13d1a6de0197f20c6babb5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9625f5484e6b6941d401ec101" ON "variants" ("product_id") `);
        await queryRunner.query(`ALTER TABLE "demand_requests" ADD CONSTRAINT "FK_84121f66b819dbcd1c5a8bcca39" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recovery_links" ADD CONSTRAINT "FK_d9dd89a63fdda18b81749fe8d01" FOREIGN KEY ("demand_request_id") REFERENCES "demand_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_attributions" ADD CONSTRAINT "FK_c529fc01765c17c379c79749f16" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_attributions" ADD CONSTRAINT "FK_7df7e0ea8a32f90b53e83b7bbe5" FOREIGN KEY ("recovery_link_id") REFERENCES "recovery_links"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9e952e93f369f16e27dd786c33f" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "variants" ADD CONSTRAINT "FK_a9625f5484e6b6941d401ec101c" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "variants" DROP CONSTRAINT "FK_a9625f5484e6b6941d401ec101c"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9e952e93f369f16e27dd786c33f"`);
        await queryRunner.query(`ALTER TABLE "order_attributions" DROP CONSTRAINT "FK_7df7e0ea8a32f90b53e83b7bbe5"`);
        await queryRunner.query(`ALTER TABLE "order_attributions" DROP CONSTRAINT "FK_c529fc01765c17c379c79749f16"`);
        await queryRunner.query(`ALTER TABLE "recovery_links" DROP CONSTRAINT "FK_d9dd89a63fdda18b81749fe8d01"`);
        await queryRunner.query(`ALTER TABLE "demand_requests" DROP CONSTRAINT "FK_84121f66b819dbcd1c5a8bcca39"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9625f5484e6b6941d401ec101"`);
        await queryRunner.query(`DROP TABLE "variants"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9e952e93f369f16e27dd786c33"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "shops"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7df7e0ea8a32f90b53e83b7bbe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c529fc01765c17c379c79749f1"`);
        await queryRunner.query(`DROP TABLE "order_attributions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14ac80cf247b584608850551df"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9dd89a63fdda18b81749fe8d0"`);
        await queryRunner.query(`DROP TABLE "recovery_links"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_84121f66b819dbcd1c5a8bcca3"`);
        await queryRunner.query(`DROP TABLE "demand_requests"`);
        await queryRunner.query(`DROP TYPE "public"."demand_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."demand_requests_channel_enum"`);
    }

}
